import { create } from 'zustand';
import axios from 'axios';
import type { CompareDirection } from '../types/sync';

interface Page {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  bodySummary: string;
}

interface ComparisonResult {
  id: string;
  handle: string;
  title: string;
  status: 'missing_in_staging' | 'missing_in_production' | 'different';
  differences?: string[];
  updatedAt: string | null;
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
    environment: 'production' | 'staging',
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

export const usePagesSyncStore = create<PagesSyncStore>((set, get) => ({
  pages: [],
  comparisonResults: [],
  isLoading: false,
  error: null,
  hasNextPage: false,
  endCursor: null,

  fetchPages: async (environment, cursor?: string | null) => {
    set({ isLoading: true, error: null });

    const apiUrl =
      environment === 'production'
        ? import.meta.env.VITE_SHOPIFY_STORE_URL
        : import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL;

    const accessToken =
      environment === 'production'
        ? import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
        : import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN;

    try {
      const { data } = await axios({
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        data: {
          query: `
            query PageList ($after: String) {
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
          `,
          variables: {
            after: cursor,
          },
        },
      });

      const pagesData = data.data.pages.edges.map(
        (edge: { node: Page }) => edge.node
      );

      set((state) => ({
        pages: cursor ? [...state.pages, ...pagesData] : pagesData,
        hasNextPage: data.data.pages.pageInfo.hasNextPage,
        endCursor: data.data.pages.pageInfo.endCursor,
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

    const sourceUrl =
      direction === 'production_to_staging'
        ? import.meta.env.VITE_SHOPIFY_STORE_URL
        : import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL;

    const targetUrl =
      direction === 'production_to_staging'
        ? import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL
        : import.meta.env.VITE_SHOPIFY_STORE_URL;

    const sourceToken =
      direction === 'production_to_staging'
        ? import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
        : import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN;

    const targetToken =
      direction === 'production_to_staging'
        ? import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN
        : import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN;

    try {
      // Process one page at a time
      for (const id of ids) {
        // 1. Fetch full page details from source
        const sourceResponse = await axios({
          url: sourceUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': sourceToken,
          },
          data: {
            query: `
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
            `,
            variables: { id },
          },
        });

        const sourcePageData = sourceResponse.data.data.page;

        // 2. Check if page exists in target by handle
        const targetCheckResponse = await axios({
          url: targetUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': targetToken,
          },
          data: {
            query: `
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
            `,
            variables: {
              first: 250,
            },
          },
        });

        const existingPage = targetCheckResponse.data.data.pages.edges.find(
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
          await axios({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': targetToken,
            },
            data: {
              query: `
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
              `,
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
            },
          });

          console.log(
            `Updated page ${sourcePageData.handle} - found differences`
          );
        } else {
          // 3b. Create new page if it doesn't exist
          await axios({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': targetToken,
            },
            data: {
              query: `
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
              `,
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
