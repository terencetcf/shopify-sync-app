import { create } from 'zustand';
import axios from 'axios';
import type { CompareDirection } from '../types/sync';
import type { CollectionDetails, ComparisonResult } from '../types/collections';

interface CollectionsSyncStore {
  productionCollections: CollectionDetails[];
  stagingCollections: CollectionDetails[];
  comparisonResults: ComparisonResult[];
  isLoading: boolean;
  isLoadingProduction: boolean;
  isLoadingStaging: boolean;
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  isStagingToProductionEnabled: boolean;
  setCompareDirection: (direction: CompareDirection) => void;
  fetchCollections: () => Promise<void>;
  fetchCollectionDetails: (
    environment: 'production' | 'staging'
  ) => Promise<CollectionDetails[]>;
  resetComparison: () => void;
  compareCollections: (direction: CompareDirection) => Promise<void>;
  syncCollections: (
    ids: string[],
    direction: CompareDirection
  ) => Promise<void>;
}

export const useCollectionsSyncStore = create<CollectionsSyncStore>(
  (set, get) => ({
    productionCollections: [],
    stagingCollections: [],
    comparisonResults: [],
    isLoading: false,
    isLoadingProduction: false,
    isLoadingStaging: false,
    error: null,
    compareDirection: 'production_to_staging',
    hasCompared: false,
    isStagingToProductionEnabled: false,

    setCompareDirection: (direction) => set({ compareDirection: direction }),

    resetComparison: () =>
      set({
        hasCompared: false,
        comparisonResults: [],
      }),

    fetchCollections: async () => {
      set({
        isLoadingProduction: true,
        isLoadingStaging: true,
        error: null,
      });

      try {
        // Fetch production collections
        const productionCollections = await get().fetchCollectionDetails(
          'production'
        );
        // Fetch staging collections
        const stagingCollections = await get().fetchCollectionDetails(
          'staging'
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

    fetchCollectionDetails: async (environment: 'production' | 'staging') => {
      const apiUrl =
        environment === 'production'
          ? import.meta.env.VITE_SHOPIFY_STORE_URL
          : import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL;

      const accessToken =
        environment === 'production'
          ? import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN
          : import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN;

      const response = await axios({
        url: apiUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
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
                    descriptionHtml
                    sortOrder
                    templateSuffix
                    ruleSet {
                      rules {
                        column
                        relation
                        condition
                      }
                    }
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      return response.data.data.collections.edges.map(
        (edge: { node: CollectionDetails }) => edge.node
      );
    },

    compareCollections: async (direction: CompareDirection) => {
      set({ isLoading: true, error: null });
      try {
        // First fetch all collections to ensure we have latest data
        await get().fetchCollections();

        const sourceCollections =
          direction === 'production_to_staging'
            ? get().productionCollections
            : get().stagingCollections;

        const targetCollections =
          direction === 'production_to_staging'
            ? get().stagingCollections
            : get().productionCollections;

        const results: ComparisonResult[] = [];

        // Only check collections from source to target based on direction
        sourceCollections.forEach((sourceCollection) => {
          const targetCollection = targetCollections.find(
            (target) => target.handle === sourceCollection.handle
          );

          if (!targetCollection) {
            // Collection missing in target environment
            results.push({
              id: sourceCollection.id,
              handle: sourceCollection.handle,
              title: sourceCollection.title,
              status:
                direction === 'production_to_staging'
                  ? 'missing_in_staging'
                  : 'missing_in_production',
              updatedAt: sourceCollection.updatedAt,
              productionCount:
                direction === 'production_to_staging'
                  ? sourceCollection.productsCount
                  : null,
              stagingCount:
                direction === 'staging_to_production'
                  ? sourceCollection.productsCount
                  : null,
            });
          } else {
            // Check for differences
            const differences: string[] = [];

            if (sourceCollection.title !== targetCollection.title) {
              differences.push('title');
            }

            if (
              sourceCollection.descriptionHtml !==
              targetCollection.descriptionHtml
            ) {
              differences.push('description');
            }

            if (sourceCollection.sortOrder !== targetCollection.sortOrder) {
              differences.push('sortOrder');
            }

            if (
              sourceCollection.templateSuffix !==
              targetCollection.templateSuffix
            ) {
              differences.push('template');
            }
            if (
              JSON.stringify(sourceCollection.ruleSet?.rules) !==
              JSON.stringify(targetCollection.ruleSet?.rules)
            ) {
              differences.push('rules');
            }

            if (differences.length > 0) {
              results.push({
                id: sourceCollection.id,
                handle: sourceCollection.handle,
                title: sourceCollection.title,
                status: 'different',
                differences,
                updatedAt: sourceCollection.updatedAt,
                productionCount:
                  direction === 'production_to_staging'
                    ? sourceCollection.productsCount
                    : null,
                stagingCount:
                  direction === 'staging_to_production'
                    ? sourceCollection.productsCount
                    : null,
              });
            }
          }
        });

        set({
          comparisonResults: results,
          isLoading: false,
          hasCompared: true,
        });
      } catch (err: any) {
        set({ error: 'Failed to compare collections', isLoading: false });
        console.error('Error comparing collections:', err);
      }
    },

    syncCollections: async (ids: string[], direction: CompareDirection) => {
      set({ isLoading: true, error: null });
      try {
        const sourceCollections =
          direction === 'production_to_staging'
            ? get().productionCollections
            : get().stagingCollections;

        const targetUrl =
          direction === 'production_to_staging'
            ? import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL
            : import.meta.env.VITE_SHOPIFY_STORE_URL;

        const targetToken =
          direction === 'production_to_staging'
            ? import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN
            : import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN;

        // Process selected collections
        for (const id of ids) {
          const sourceCollection = sourceCollections.find(
            (col) => col.id === id
          );
          if (!sourceCollection) continue;

          // First check if collection exists in target
          const checkResponse = await axios({
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': targetToken,
            },
            data: {
              query: `
                query GetCollectionByHandle($handle: String!) {
                  collectionByHandle(handle: $handle) {
                    id
                  }
                }
              `,
              variables: {
                handle: sourceCollection.handle,
              },
            },
          });

          const existingCollection = checkResponse.data.data.collectionByHandle;

          if (existingCollection) {
            // Update existing collection
            await axios({
              url: targetUrl,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': targetToken,
              },
              data: {
                query: `
                  mutation updateCollection($input: CollectionInput!) {
                    collectionUpdate(input: $input) {
                      collection {
                        id
                        title
                        description
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
                    id: existingCollection.id,
                    title: sourceCollection.title,
                    descriptionHtml: sourceCollection.descriptionHtml,
                    sortOrder: sourceCollection.sortOrder,
                    templateSuffix: sourceCollection.templateSuffix,
                  },
                },
              },
            });
          } else {
            // Create new collection
            await axios({
              url: targetUrl,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': targetToken,
              },
              data: {
                query: `
                  mutation CreateCollection($input: CollectionInput!) {
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
                    title: sourceCollection.title,
                    handle: sourceCollection.handle,
                    descriptionHtml: sourceCollection.descriptionHtml,
                    sortOrder: sourceCollection.sortOrder,
                    templateSuffix: sourceCollection.templateSuffix,
                    ruleSet: sourceCollection.ruleSet,
                  },
                },
              },
            });
          }

          // Remove synced item from comparison results
          set((state) => ({
            comparisonResults: state.comparisonResults.filter(
              (result) => result.id !== id
            ),
          }));
        }

        // After successful sync, fetch collections again
        await get().fetchCollections();

        set({ isLoading: false });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errors?.[0]?.message ||
          'Failed to sync collections';
        set({ error: errorMessage, isLoading: false });
        console.error('Error syncing collections:', err);
        throw err;
      }
    },
  })
);
