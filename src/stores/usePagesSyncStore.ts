import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import type {
  CompareDirection,
  ComparisonResult,
  Environment,
} from '../types/sync';
import { print } from 'graphql';
import gql from 'graphql-tag';

interface Page {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  bodySummary: string;
}

interface PageDetails {
  id: string;
  title: string;
  handle: string;
  body: string;
  bodySummary: string;
  isPublished: boolean;
  publishedAt: string | null;
  templateSuffix: string | null;
  metafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
        type: string;
      };
    }>;
  };
}

interface PagesSyncStore {
  pages: Page[];
  comparisonResults: ComparisonResult[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchPages: (
    environment: Environment,
    cursor?: string | null
  ) => Promise<Page[]>;
  comparePages: (direction: CompareDirection) => Promise<void>;
  syncPages: (handles: string[], direction: CompareDirection) => Promise<void>;
  exportComparison: (
    results: ComparisonResult[],
    direction: CompareDirection
  ) => void;
}

const arePageDetailsEqual = (
  source: PageDetails,
  target: PageDetails
): boolean => {
  return (
    source.title === target.title &&
    source.body === target.body &&
    source.bodySummary === target.bodySummary &&
    source.isPublished === target.isPublished &&
    source.templateSuffix === target.templateSuffix &&
    // Compare metafields
    source.metafields.edges.length === target.metafields.edges.length &&
    source.metafields.edges.every((sourceEdge) => {
      const targetEdge = target.metafields.edges.find(
        (edge) =>
          edge.node.namespace === sourceEdge.node.namespace &&
          edge.node.key === sourceEdge.node.key
      );
      return (
        targetEdge &&
        targetEdge.node.value === sourceEdge.node.value &&
        targetEdge.node.type === sourceEdge.node.type
      );
    })
  );
};

// Define the GraphQL queries as constants
const PAGES_LIST_QUERY = gql`
  query PageList($after: String) {
    pages(first: 50, after: $after) {
      edges {
        node {
          id
          title
          handle
          body
          bodySummary
          isPublished
          publishedAt
          templateSuffix
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PAGE_DETAILS_QUERY = gql`
  query PageDetails($id: ID!) {
    page(id: $id) {
      id
      title
      handle
      body
      bodySummary
      isPublished
      publishedAt
      templateSuffix
      metafields(first: 25) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

const GET_PAGES_QUERY = gql`
  query GetPages($first: Int!) {
    pages(first: $first) {
      edges {
        node {
          id
          handle
          title
          body
          bodySummary
          isPublished
          publishedAt
          templateSuffix
          metafields(first: 25) {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    }
  }
`;

const UPDATE_PAGE_MUTATION = gql`
  mutation UpdatePage($id: ID!, $input: PageUpdateInput!) {
    pageUpdate(id: $id, page: $input) {
      page {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_PAGE_MUTATION = gql`
  mutation CreatePage($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page {
        id
        title
        handle
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

export const usePagesSyncStore = create<PagesSyncStore>((set, get) => ({
  pages: [],
  comparisonResults: [],
  isLoading: false,
  error: null,
  hasNextPage: false,
  endCursor: null,

  fetchPages: async (environment, cursor?: string | null) => {
    set({ isLoading: true, error: null });

    try {
      const response = await shopifyApi.post(environment, {
        query: print(PAGES_LIST_QUERY),
        variables: {
          after: cursor,
        },
      });

      const pagesData = response.pages.edges.map(
        (edge: { node: Page }) => edge.node
      );

      set((state) => ({
        pages: cursor ? [...state.pages, ...pagesData] : pagesData,
        hasNextPage: response.pages.pageInfo.hasNextPage,
        endCursor: response.pages.pageInfo.endCursor,
        isLoading: false,
      }));

      return pagesData;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch pages';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching pages:', err);
      throw err;
    }
  },

  comparePages: async (direction: CompareDirection) => {
    set({ isLoading: true, error: null });
    try {
      const sourcePages = await get().fetchPages(
        direction === 'production_to_staging' ? 'production' : 'staging'
      );
      const targetPages = await get().fetchPages(
        direction === 'production_to_staging' ? 'staging' : 'production'
      );

      const results: ComparisonResult[] = [];

      // Only check pages from source to target based on direction
      sourcePages.forEach((sourcePage) => {
        const targetPage = targetPages.find(
          (target) => target.handle === sourcePage.handle
        );

        if (!targetPage) {
          // Page missing in target environment
          results.push({
            id: sourcePage.id,
            handle: sourcePage.handle,
            title: sourcePage.title,
            status:
              direction === 'production_to_staging'
                ? 'missing_in_staging'
                : 'missing_in_production',
            updatedAt: sourcePage.updatedAt,
          });
        } else {
          // Check for basic differences
          const differences: string[] = [];

          if (sourcePage.title !== targetPage.title) differences.push('title');
          if (sourcePage.bodySummary !== targetPage.bodySummary)
            differences.push('bodySummary');

          if (differences.length > 0) {
            results.push({
              id: sourcePage.id,
              handle: sourcePage.handle,
              title: sourcePage.title,
              status: 'different',
              differences,
              updatedAt: sourcePage.updatedAt,
            });
          }
        }
      });

      set({ comparisonResults: results, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to compare pages', isLoading: false });
      console.error('Error comparing pages:', err);
    }
  },

  syncPages: async (ids: string[], direction: CompareDirection) => {
    set({ isLoading: true, error: null });

    const sourceEnvironment =
      direction === 'production_to_staging' ? 'production' : 'staging';
    const targetEnvironment =
      direction === 'production_to_staging' ? 'staging' : 'production';

    try {
      // Process one page at a time
      for (const id of ids) {
        // 1. Fetch full page details from source
        const sourceResponse = await shopifyApi.post(sourceEnvironment, {
          query: print(PAGE_DETAILS_QUERY),
          variables: { id },
        });

        const sourcePageData = sourceResponse.page;

        // 2. Check if page exists in target by handle
        const targetCheckResponse = await shopifyApi.post(targetEnvironment, {
          query: print(GET_PAGES_QUERY),
          variables: {
            first: 250,
          },
        });

        const existingPage = targetCheckResponse.pages.edges.find(
          (edge: any) => edge.node.handle === sourcePageData.handle
        );

        if (existingPage) {
          // Compare source and target page details
          const targetPageData = existingPage.node;

          // Skip if pages are identical
          if (arePageDetailsEqual(sourcePageData, targetPageData)) {
            console.log(
              `Skipping sync for ${sourcePageData.handle} - no changes detected`
            );
            continue;
          }

          // 3a. Update existing page if there are differences
          await shopifyApi.post(targetEnvironment, {
            query: print(UPDATE_PAGE_MUTATION),
            variables: {
              id: targetPageData.id,
              input: {
                title: sourcePageData.title,
                body: sourcePageData.body,
                isPublished: sourcePageData.isPublished,
                templateSuffix: sourcePageData.templateSuffix,
                metafields: sourcePageData.metafields.edges.map(
                  (edge: any) => ({
                    namespace: edge.node.namespace,
                    key: edge.node.key,
                    value: edge.node.value,
                    type: edge.node.type,
                  })
                ),
              },
            },
          });

          console.log(
            `Updated page ${sourcePageData.handle} - found differences`
          );
        } else {
          // 3b. Create new page if it doesn't exist
          await shopifyApi.post(targetEnvironment, {
            query: print(CREATE_PAGE_MUTATION),
            variables: {
              page: {
                title: sourcePageData.title,
                handle: sourcePageData.handle,
                body: sourcePageData.body,
                isPublished: sourcePageData.isPublished,
                templateSuffix: sourcePageData.templateSuffix,
                metafields: sourcePageData.metafields.edges.map(
                  (edge: any) => ({
                    namespace: edge.node.namespace,
                    key: edge.node.key,
                    value: edge.node.value,
                    type: edge.node.type,
                  })
                ),
              },
            },
          });

          console.log(`Created new page ${sourcePageData.handle}`);
        }
      }

      set({ isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Failed to sync pages';
      set({ error: errorMessage, isLoading: false });
      console.error('Error syncing pages:', err);
      throw err;
    }
  },

  exportComparison: (
    results: ComparisonResult[],
    direction: CompareDirection
  ) => {
    const csvContent = [
      ['Handle', 'Title', 'Status', 'Last Updated'],
      ...results.map((result) => [
        result.handle,
        result.title,
        direction === 'production_to_staging'
          ? 'Missing in Staging'
          : 'Missing in Production',
        result.updatedAt
          ? new Date(result.updatedAt).toLocaleDateString()
          : '-',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pages-comparison-${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.click();
  },
}));
