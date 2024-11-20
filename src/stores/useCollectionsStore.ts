import { create } from 'zustand';
import axios from 'axios';

interface Collection {
  id: string;
  title: string;
  handle: string;
  productsCount: number;
  updatedAt: string;
}

interface CollectionResponse {
  data: {
    collections: {
      edges: {
        node: Collection;
      }[];
    };
  };
}

interface CollectionsStore {
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  fetchCollections: () => Promise<void>;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
  collections: [],
  isLoading: false,
  error: null,
  fetchCollections: async () => {
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
            query {
              collections(first: 100) {
                edges {
                  node {
                    id
                    title
                    handle
                    productsCount
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      const collectionsData = data.data.collections.edges.map(
        (edge: { node: Collection }) => edge.node
      );

      set({ collections: collectionsData, isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch collections';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching collections:', err);
    }
  },
}));
