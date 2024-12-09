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
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  resultsDirection: CompareDirection | null;
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

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: CollectionDetails;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

const COLLECTIONS_QUERY = gql`
  query getCollections($cursor: String) {
    collections(first: 250, after: $cursor) {
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
      pageInfo {
        hasNextPage
        endCursor
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
    error: null,
    compareDirection: 'production_to_staging',
    hasCompared: false,
    resultsDirection: null,

    setCompareDirection: (direction) => {
      set({
        compareDirection: direction,
        comparisonResults:
          get().resultsDirection === direction ? get().comparisonResults : [],
        hasCompared:
          get().resultsDirection === direction ? get().hasCompared : false,
      });
    },

    resetComparison: () =>
      set({
        hasCompared: false,
        comparisonResults: [],
        resultsDirection: null,
      }),

    fetchCollections: async () => {
      set({ isLoading: true, error: null });

      try {
        const productionCollections = await get().fetchCollectionDetails(
          'production'
        );
        const stagingCollections = await get().fetchCollectionDetails(
          'staging'
        );

        set({
          productionCollections,
          stagingCollections,
          isLoading: false,
          hasCompared: true,
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errors?.[0]?.message ||
          'Failed to fetch collections';
        set({ error: errorMessage, isLoading: false });
        console.error('Error fetching collections:', err);
      }
    },

    fetchCollectionDetails: async (environment: Environment) => {
      const response = await shopifyApi.post<CollectionsResponse>(environment, {
        query: print(COLLECTIONS_QUERY),
      });

      return response.collections.edges.map((edge) => edge.node);
    },

    compareCollections: async (direction: CompareDirection) => {
      set({ isLoading: true, error: null });
      try {
        // First, fetch ALL collections from both environments
        const sourceEnvironment =
          direction === 'production_to_staging' ? 'production' : 'staging';
        const targetEnvironment =
          direction === 'production_to_staging' ? 'staging' : 'production';

        // Fetch all collections from source environment
        let sourceCollections: CollectionDetails[] = [];
        let hasNextPage = true;
        let cursor: string | null = null;

        while (hasNextPage) {
          const response: CollectionsResponse =
            await shopifyApi.post<CollectionsResponse>(sourceEnvironment, {
              query: print(COLLECTIONS_QUERY),
              variables: { cursor },
            });

          const newCollections = response.collections.edges.map(
            (edge: { node: CollectionDetails }) => edge.node
          );
          sourceCollections = [...sourceCollections, ...newCollections];

          hasNextPage = response.collections.pageInfo.hasNextPage;
          cursor = response.collections.pageInfo.endCursor;
        }

        // Reset for target environment fetch
        hasNextPage = true;
        cursor = null;
        let targetCollections: CollectionDetails[] = [];

        // Fetch all collections from target environment
        while (hasNextPage) {
          const response: CollectionsResponse =
            await shopifyApi.post<CollectionsResponse>(targetEnvironment, {
              query: print(COLLECTIONS_QUERY),
              variables: { cursor },
            });

          const newCollections = response.collections.edges.map(
            (edge: { node: CollectionDetails }) => edge.node
          );
          targetCollections = [...targetCollections, ...newCollections];

          hasNextPage = response.collections.pageInfo.hasNextPage;
          cursor = response.collections.pageInfo.endCursor;
        }

        // Store the complete collections lists
        set({
          productionCollections:
            direction === 'production_to_staging'
              ? sourceCollections
              : targetCollections,
          stagingCollections:
            direction === 'production_to_staging'
              ? targetCollections
              : sourceCollections,
        });

        // Now do the comparison with complete data
        const results: ComparisonResult[] = [];

        sourceCollections.forEach((sourceCollection) => {
          const targetCollection = targetCollections.find(
            (target) => target.handle === sourceCollection.handle
          );

          if (!targetCollection) {
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
          resultsDirection: direction,
        });
      } catch (err: any) {
        set({
          error: 'Failed to compare collections',
          isLoading: false,
          resultsDirection: null,
        });
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
