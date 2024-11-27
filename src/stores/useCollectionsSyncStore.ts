import { create } from 'zustand';
import type {
  CompareDirection,
  ComparisonResult,
  Environment,
} from '../types/sync';
import type { CollectionDetails } from '../types/collections';
import { shopifyApi } from '../services/shopify';
import { print } from 'graphql';
import gql from 'graphql-tag';

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
    environment: Environment
  ) => Promise<CollectionDetails[]>;
  resetComparison: () => void;
  compareCollections: (direction: CompareDirection) => Promise<void>;
  syncCollections: (
    ids: string[],
    direction: CompareDirection
  ) => Promise<void>;
}

const COLLECTIONS_QUERY = gql`
  query {
    collections(first: 250) {
      edges {
        node {
          id
          title
          handle
          updatedAt
          sortOrder
          descriptionHtml
          templateSuffix
          image {
            id
            url
            altText
          }
          seo {
            title
            description
          }
        }
      }
    }
  }
`;

const UPDATE_COLLECTION_MUTATION = gql`
  mutation updateCollection($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection {
        id
        title
        handle
        image {
          id
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_COLLECTION_MUTATION = gql`
  mutation CreateCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
        handle
        image {
          id
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

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

    fetchCollectionDetails: async (environment: Environment) => {
      const response = await shopifyApi.post(environment, {
        query: print(COLLECTIONS_QUERY),
      });

      return response.collections.edges.map(
        (edge: { node: CollectionDetails }) => edge.node
      );
    },

    compareCollections: async (direction: CompareDirection) => {
      set({ isLoading: true, error: null });
      try {
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
            if (sourceCollection.sortOrder !== targetCollection.sortOrder) {
              differences.push('sortOrder');
            }
            if (
              sourceCollection.descriptionHtml !==
              targetCollection.descriptionHtml
            ) {
              differences.push('description');
            }
            if (
              sourceCollection.templateSuffix !==
              targetCollection.templateSuffix
            ) {
              differences.push('template');
            }

            // Compare image fields
            const sourceTimestamp = getImageTimestamp(
              sourceCollection.image?.url
            );
            const targetTimestamp = getImageTimestamp(
              targetCollection.image?.url
            );

            if (
              // Source has image but target doesn't
              (sourceCollection.image?.url && !targetCollection.image?.url) ||
              // Source image is newer than target
              sourceTimestamp > targetTimestamp ||
              // Alt text is different
              sourceCollection.image?.altText !==
                targetCollection.image?.altText
            ) {
              differences.push('image');
            }

            // Compare SEO fields
            if (
              sourceCollection.seo?.title !== targetCollection.seo?.title ||
              sourceCollection.seo?.description !==
                targetCollection.seo?.description
            ) {
              differences.push('seo');
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

        const targetCollections =
          direction === 'production_to_staging'
            ? get().stagingCollections
            : get().productionCollections;

        const targetEnvironment: Environment =
          direction === 'production_to_staging' ? 'staging' : 'production';

        // Process selected collections
        for (const id of ids) {
          const sourceCollection = sourceCollections.find(
            (col) => col.id === id
          );
          if (!sourceCollection) continue;

          // First check if collection exists in target
          const existingCollection = targetCollections.find(
            (col) => col.handle === sourceCollection.handle
          );

          if (existingCollection) {
            // Update existing collection
            await shopifyApi.post(targetEnvironment, {
              query: print(UPDATE_COLLECTION_MUTATION),
              variables: {
                input: {
                  id: existingCollection.id,
                  title: sourceCollection.title,
                  descriptionHtml: sourceCollection.descriptionHtml,
                  sortOrder: sourceCollection.sortOrder,
                  templateSuffix: sourceCollection.templateSuffix,
                  image: sourceCollection.image
                    ? {
                        id: sourceCollection.image.id,
                        altText: sourceCollection.image.altText,
                        src: sourceCollection.image.url,
                      }
                    : undefined,
                  seo: sourceCollection.seo
                    ? {
                        title: sourceCollection.seo.title,
                        description: sourceCollection.seo.description,
                      }
                    : undefined,
                },
              },
            });
          } else {
            // Create new collection
            await shopifyApi.post(targetEnvironment, {
              query: print(CREATE_COLLECTION_MUTATION),
              variables: {
                input: {
                  title: sourceCollection.title,
                  handle: sourceCollection.handle,
                  descriptionHtml: sourceCollection.descriptionHtml,
                  sortOrder: sourceCollection.sortOrder,
                  templateSuffix: sourceCollection.templateSuffix,
                  image: sourceCollection.image
                    ? {
                        id: sourceCollection.image.id,
                        altText: sourceCollection.image.altText,
                        src: sourceCollection.image.url,
                      }
                    : undefined,
                  seo: sourceCollection.seo
                    ? {
                        title: sourceCollection.seo.title,
                        description: sourceCollection.seo.description,
                      }
                    : undefined,
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

// Add helper function to extract timestamp from image URL
const getImageTimestamp = (url: string | undefined): number => {
  if (!url) return 0;
  const match = url.match(/v=(\d+)/);
  return match ? parseInt(match[1]) : 0;
};
