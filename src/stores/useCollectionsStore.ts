import { create } from 'zustand';
import axios from 'axios';

interface Collection {
  id: string;
  title: string;
  handle: string;
  productsCount: number;
  updatedAt: string;
}

interface CollectionsConnection {
  edges: {
    node: Collection;
    cursor: string;
  }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

interface CollectionResponse {
  data: {
    collections: CollectionsConnection;
  };
}

interface CollectionsStore {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchCollections: (cursor?: string | null) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
  collections: [],
  isLoading: false,
  error: null,
  hasNextPage: false,
  endCursor: null,
  fetchCollections: async (cursor?: string | null) => {
    set({ isLoading: true, error: null });

    try {
      const { data } = await axios({
        url: import.meta.env.VITE_SHOPIFY_STORE_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
        },
        data: {
          query: `
            query getCollections($cursor: String) {
              collections(first: 25, after: $cursor) {
                edges {
                  node {
                    id
                    title
                    handle
                    productsCount
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

      const collectionsData = data.data.collections.edges.map(
        (edge: { node: Collection }) => edge.node
      );

      set((state) => ({
        collections: cursor
          ? [...state.collections, ...collectionsData]
          : collectionsData,
        hasNextPage: data.data.collections.pageInfo.hasNextPage,
        endCursor: data.data.collections.pageInfo.endCursor,
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch collections';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching collections:', err);
    }
  },
}));
