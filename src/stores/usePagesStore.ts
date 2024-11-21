import { create } from 'zustand';
import axios from 'axios';

interface Page {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  bodySummary: string;
}

interface PagesStore {
  pages: Page[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchPages: (cursor?: string | null) => Promise<void>;
}

export const usePagesStore = create<PagesStore>((set) => ({
  pages: [],
  isLoading: false,
  error: null,
  hasNextPage: false,
  endCursor: null,
  fetchPages: async (cursor?: string | null) => {
    set({ isLoading: true, error: null });

    try {
      const { data } = await axios({
        url: import.meta.env.VITE_SHOPIFY_STORE_DOMAIN,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': import.meta.env
            .VITE_SHOPIFY_STOREFRONT_TOKEN,
        },
        data: {
          query: `
            query getPages($cursor: String) {
              pages(first: 25, after: $cursor) {
                edges {
                  node {
                    id
                    title
                    handle
                    bodySummary
                    updatedAt
                  }
                  cursor
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `,
          variables: {
            cursor: cursor,
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
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch pages';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching pages:', err);
    }
  },
}));
