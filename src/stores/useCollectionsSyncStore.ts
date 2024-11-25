import { create } from 'zustand';
import axios from 'axios';

interface Collection {
  id: string;
  title: string;
  handle: string;
  productsCount: {
    count: number;
    precision: number;
  };
  updatedAt: string;
}

type CompareDirection = 'production_to_staging' | 'staging_to_production';

interface CollectionsSyncStore {
  productionCollections: Collection[];
  stagingCollections: Collection[];
  isLoadingProduction: boolean;
  isLoadingStaging: boolean;
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  isStagingToProductionEnabled: boolean;
  setCompareDirection: (direction: CompareDirection) => void;
  fetchCollections: () => Promise<void>;
  resetComparison: () => void;
  syncCollections: (
    handles: string[],
    direction: CompareDirection
  ) => Promise<void>;
}

export const useSyncStore = create<CollectionsSyncStore>((set, get) => ({
  productionCollections: [],
  stagingCollections: [],
  isLoadingProduction: false,
  isLoadingStaging: false,
  error: null,
  compareDirection: 'production_to_staging',
  hasCompared: false,
  isStagingToProductionEnabled: false,
  setCompareDirection: (direction) => set({ compareDirection: direction }),
  resetComparison: () => set({ hasCompared: false }),
  fetchCollections: async () => {
    set({ isLoadingProduction: true, isLoadingStaging: true, error: null });

    try {
      // Fetch production collections
      const productionResponse = await axios({
        url: import.meta.env.VITE_SHOPIFY_STORE_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
        },
        data: {
          query: `
            query {
              collections(first: 250) {
                edges {
                  node {
                    id
                    title
                    handle
                    productsCount {
                      count
                      precision
                    }
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      // Fetch staging collections
      const stagingResponse = await axios({
        url: import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': import.meta.env
            .VITE_SHOPIFY_STAGING_ACCESS_TOKEN,
        },
        data: {
          query: `
            query {
              collections(first: 250) {
                edges {
                  node {
                    id
                    title
                    handle
                    productsCount {
                      count
                      precision
                    }
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      const productionCollections =
        productionResponse.data.data.collections.edges.map(
          (edge: { node: Collection }) => edge.node
        );

      const stagingCollections =
        stagingResponse.data.data.collections.edges.map(
          (edge: { node: Collection }) => edge.node
        );

      set({
        productionCollections,
        stagingCollections,
        isLoadingProduction: false,
        isLoadingStaging: false,
        hasCompared: true,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch collections';
      set({
        error: errorMessage,
        isLoadingProduction: false,
        isLoadingStaging: false,
      });
      console.error('Error fetching collections:', err);
    }
  },
  syncCollections: async (handles: string[], direction: CompareDirection) => {
    try {
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

      // Fetch full collection details from source
      const sourceResponse = await axios({
        url: sourceUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': sourceToken,
        },
        data: {
          query: `
            query getCollectionDetails($handle: String!) {
              collectionByHandle(handle: $handle) {
                title
                handle
                descriptionHtml
                ruleSet {
                  rules {
                    column
                    relation
                    condition
                  }
                }
                sortOrder
              }
            }
          `,
          variables: {
            handle: handles[0], // Process one collection at a time
          },
        },
      });

      const collectionDetails = sourceResponse.data.data.collectionByHandle;

      // Create collection in target environment
      await axios({
        url: targetUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': targetToken,
        },
        data: {
          query: `
            mutation createCollection($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection {
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
            input: {
              handle: collectionDetails.handle,
              title: collectionDetails.title,
              descriptionHtml: collectionDetails.descriptionHtml,
              ruleSet: collectionDetails.ruleSet,
              sortOrder: collectionDetails.sortOrder,
            },
          },
        },
      });

      // Refresh collections after sync
      await get().fetchCollections();
    } catch (err: any) {
      console.error('Error syncing collections:', err);
      throw new Error(
        err.response?.data?.errors?.[0]?.message || 'Failed to sync collections'
      );
    }
  },
}));
