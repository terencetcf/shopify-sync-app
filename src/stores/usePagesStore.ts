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
  status: 'missing_in_staging' | 'missing_in_production';
  updatedAt: string | null;
}

interface PagesStore {
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

export const usePagesStore = create<PagesStore>((set, get) => ({
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

      const sourcePageMap = new Map(
        sourcePages.map((page) => [page.handle, page])
      );
      const targetHandles = new Set(targetPages.map((page) => page.handle));

      const missingPages = sourcePages.filter(
        (page) => !targetHandles.has(page.handle)
      );

      const results: ComparisonResult[] = missingPages.map((page) => ({
        id: page.id,
        handle: page.handle,
        title: page.title,
        status:
          direction === 'production_to_staging'
            ? 'missing_in_staging'
            : 'missing_in_production',
        updatedAt: page.updatedAt,
      }));

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
              query PageShow($id: ID!) {
                page(id: $id) {
                  title
                  handle
                  body
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
            variables: {
              id,
            },
          },
        });

        const pageData = sourceResponse.data.data.page;

        // 2. Create page in target environment
        const createResponse = await axios({
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
                title: pageData.title,
                handle: pageData.handle,
                body: pageData.body,
                bodySummary: pageData.bodySummary,
                isPublished: pageData.isPublished,
                templateSuffix: pageData.templateSuffix,
                metafields: pageData.metafields.edges?.map((edge: any) => ({
                  namespace: edge.node.namespace,
                  key: edge.node.key,
                  value: edge.node.value,
                  type: edge.node.type,
                })),
              },
            },
          },
        });

        const { userErrors } = createResponse.data.data.pageCreate;
        if (userErrors && userErrors.length > 0) {
          throw new Error(
            `Failed to create page: ${userErrors
              .map((e: { message: string }) => e.message)
              .join(', ')}`
          );
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
