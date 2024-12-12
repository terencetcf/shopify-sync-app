import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { logger } from '../utils/logger';
import { Environment } from '../types/sync';
import { PageInfo } from '../types/pageInfo';
import { collectionDb } from '../services/collectionDb';
import gql from 'graphql-tag';
import { print } from 'graphql';
import { productDb } from '../services/productDb';

interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface CollectionComparison {
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedCollection {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  sortOrder: string;
  templateSuffix: string | null;
  image: {
    altText: string | null;
    url: string;
  } | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  productsCount: {
    count: number;
  };
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        totalInventory: number;
      };
    }>;
  };
}

interface CollectionsSyncStore {
  collections: CollectionComparison[];
  selectedCollection: DetailedCollection | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  fetchStoredCollections: () => Promise<void>;
  compareCollections: () => Promise<void>;
  syncCollections: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchCollectionDetails: (
    id: string,
    environment: Environment
  ) => Promise<void>;
}

interface ShopifyCollectionResponse {
  collections: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
    pageInfo: PageInfo;
  };
}

interface DetailedShopifyCollection extends ShopifyCollection {
  description: string;
  descriptionHtml: string;
  sortOrder: string;
  templateSuffix: string | null;
  image: {
    altText: string | null;
    url: string;
  } | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        totalInventory: number;
      };
    }>;
  };
}

interface CollectionCreateResponse {
  collectionCreate: {
    collection: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface CollectionUpdateResponse {
  collectionUpdate: {
    collection: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

const COLLECTIONS_QUERY = gql`
  query GetCollections($cursor: String) {
    collections(first: 250, after: $cursor) {
      edges {
        node {
          id
          handle
          title
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

const COLLECTION_DETAILS_QUERY = gql`
  query GetCollectionDetails($id: ID!) {
    collection(id: $id) {
      id
      handle
      title
      updatedAt
      description
      descriptionHtml
      sortOrder
      templateSuffix
      image {
        altText
        url
      }
      seo {
        title
        description
      }
      productsCount {
        count
      }
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
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
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_COLLECTION_MUTATION = gql`
  mutation createCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function fetchAllCollections(
  environment: Environment
): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      logger.info(
        `Fetching collections for ${environment} with cursor: ${cursor}`
      );

      const response: ShopifyCollectionResponse =
        await shopifyApi.post<ShopifyCollectionResponse>(environment, {
          query: print(COLLECTIONS_QUERY),
          variables: { cursor },
        });

      const {
        edges,
        pageInfo,
      }: {
        edges: Array<{ node: ShopifyCollection }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      } = response.collections;

      const newCollections = edges.map(({ node }) => node);
      collections.push(...newCollections);

      logger.info(
        `Fetched ${newCollections.length} collections for ${environment}`
      );
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching collections for ${environment}:`, err);
      throw err;
    }
  }

  logger.info(
    `Total collections fetched for ${environment}: ${collections.length}`
  );
  return collections;
}

async function fetchCollectionDetails(
  environment: Environment,
  id: string
): Promise<DetailedShopifyCollection> {
  try {
    const response = await shopifyApi.post<{
      collection: DetailedShopifyCollection;
    }>(environment, {
      query: print(COLLECTION_DETAILS_QUERY),
      variables: { id },
    });
    return response.collection;
  } catch (err) {
    logger.error(
      `Error fetching collection details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

async function compareCollectionDetails(
  productionCollection: DetailedShopifyCollection,
  stagingCollection: DetailedShopifyCollection
): Promise<string[]> {
  const differences: string[] = [];

  // Compare basic fields
  if (productionCollection.title !== stagingCollection.title) {
    differences.push('Title mismatch');
    logger.info(
      'Title mismatch',
      productionCollection.title,
      stagingCollection.title
    );
  }
  if (productionCollection.description !== stagingCollection.description) {
    differences.push('Description mismatch');
    logger.info(
      'Description mismatch',
      productionCollection.description,
      stagingCollection.description
    );
  }
  if (
    productionCollection.descriptionHtml !== stagingCollection.descriptionHtml
  ) {
    differences.push('HTML description mismatch');
    logger.info(
      'HTML description mismatch',
      productionCollection.descriptionHtml,
      stagingCollection.descriptionHtml
    );
  }
  if (productionCollection.sortOrder !== stagingCollection.sortOrder) {
    differences.push('Sort order mismatch');
    logger.info(
      'Sort order mismatch',
      productionCollection.sortOrder,
      stagingCollection.sortOrder
    );
  }
  if (
    productionCollection.templateSuffix !== stagingCollection.templateSuffix
  ) {
    differences.push('Template suffix mismatch');
    logger.info(
      'Template suffix mismatch',
      productionCollection.templateSuffix,
      stagingCollection.templateSuffix
    );
  }

  // Compare image alt text
  if (
    productionCollection.image?.altText !== stagingCollection.image?.altText
  ) {
    differences.push('Image alt text mismatch');
    logger.info(
      'Image alt text mismatch',
      productionCollection.image?.altText,
      stagingCollection.image?.altText
    );
  }

  // Compare SEO fields
  if (productionCollection.seo?.title !== stagingCollection.seo?.title) {
    differences.push('SEO title mismatch');
    logger.info(
      'SEO title mismatch',
      productionCollection.seo?.title,
      stagingCollection.seo?.title
    );
  }
  if (
    productionCollection.seo?.description !== stagingCollection.seo?.description
  ) {
    differences.push('SEO description mismatch');
    logger.info(
      'SEO description mismatch',
      productionCollection.seo?.description,
      stagingCollection.seo?.description
    );
  }

  return differences;
}

async function syncCollectionToEnvironment(
  handle: string,
  sourceEnvironment: Environment,
  targetEnvironment: Environment
): Promise<void> {
  try {
    const sourceId =
      sourceEnvironment === 'production' ? 'production_id' : 'staging_id';
    const targetId =
      sourceEnvironment === 'production' ? 'staging_id' : 'production_id';

    const collection = await collectionDb.getCollectionComparison(handle);

    if (!collection || !collection[sourceId]) {
      throw new Error(`Collection ${handle} not found in ${sourceEnvironment}`);
    }

    // Fetch detailed collection data from source
    const sourceDetails = await fetchCollectionDetails(
      sourceEnvironment,
      collection[sourceId]
    );

    // Get product IDs from source collection
    const sourceProductHandles = sourceDetails.products.edges.map(
      ({ node }) => node.handle
    );

    // Get corresponding target product IDs
    const targetProductIds: string[] = [];
    for (const productHandle of sourceProductHandles) {
      const productComparison = await productDb.getProductComparison(
        productHandle
      );
      if (productComparison?.[targetId]) {
        targetProductIds.push(productComparison[targetId]!);
      } else {
        throw new Error(
          `Product ${productHandle} not found in ${targetEnvironment}!`
        );
      }
    }

    // Prepare mutation variables
    const input = {
      handle: sourceDetails.handle,
      title: sourceDetails.title,
      descriptionHtml: sourceDetails.descriptionHtml,
      sortOrder: sourceDetails.sortOrder,
      templateSuffix: sourceDetails.templateSuffix,
      seo: sourceDetails.seo,
      image: sourceDetails.image
        ? {
            altText: sourceDetails.image.altText,
            src: sourceDetails.image.url,
          }
        : null,
      products: targetProductIds, // Add products to mutation input
    };

    if (collection[targetId]) {
      // Collection exists in target environment, use update mutation
      const response = await shopifyApi.post<CollectionUpdateResponse>(
        targetEnvironment,
        {
          query: print(UPDATE_COLLECTION_MUTATION),
          variables: {
            input: {
              ...input,
              id: collection[targetId],
            },
          },
        }
      );

      if (response.collectionUpdate.userErrors?.length > 0) {
        throw new Error(response.collectionUpdate.userErrors[0].message);
      }

      logger.info(
        `Successfully updated collection ${handle} in ${targetEnvironment}`
      );
    } else {
      // Collection doesn't exist in target environment, use create mutation
      const response = await shopifyApi.post<CollectionCreateResponse>(
        targetEnvironment,
        {
          query: print(CREATE_COLLECTION_MUTATION),
          variables: { input },
        }
      );

      if (response.collectionCreate.userErrors?.length > 0) {
        throw new Error(response.collectionCreate.userErrors[0].message);
      }

      logger.info(
        `Successfully created collection ${handle} in ${targetEnvironment}`
      );
    }
  } catch (err) {
    logger.error(
      `Failed to sync collection ${handle} to ${targetEnvironment}:`,
      err
    );
    throw err;
  }
}

export const useCollectionsSyncStore = create<CollectionsSyncStore>(
  (set, get) => ({
    collections: [],
    selectedCollection: null,
    isLoading: false,
    isLoadingDetails: false,
    error: null,

    fetchStoredCollections: async () => {
      set({ isLoading: true, error: null });
      try {
        const collections = await collectionDb.getCollectionComparisons();
        set({ collections, isLoading: false });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        logger.error('Failed to fetch stored collections:', err);
      }
    },

    compareCollections: async () => {
      set({ isLoading: true, error: null });
      try {
        logger.info('Starting collection comparison...');
        const [productionCollections, stagingCollections] = await Promise.all([
          fetchAllCollections('production'),
          fetchAllCollections('staging'),
        ]);

        const productionMap = new Map(
          productionCollections.map((c) => [c.handle, c])
        );
        const stagingMap = new Map(
          stagingCollections.map((c) => [c.handle, c])
        );

        const allHandles = new Set([
          ...productionMap.keys(),
          ...stagingMap.keys(),
        ]);

        logger.info(`Total unique handles found: ${allHandles.size}`);

        for (const handle of allHandles) {
          const productionCollection = productionMap.get(handle);
          const stagingCollection = stagingMap.get(handle);

          let differences: string[] = [];

          if (!productionCollection) {
            differences = ['Missing in production'];
          } else if (!stagingCollection) {
            differences = ['Missing in staging'];
          } else if (
            productionCollection.updatedAt !== stagingCollection.updatedAt
          ) {
            // Fetch and compare detailed collection data
            logger.info(`Detailed comparison needed for ${handle}`);
            const [productionDetails, stagingDetails] = await Promise.all([
              fetchCollectionDetails('production', productionCollection.id),
              fetchCollectionDetails('staging', stagingCollection.id),
            ]);

            differences = await compareCollectionDetails(
              productionDetails,
              stagingDetails
            );
          } else {
            differences = ['In sync'];
          }

          await collectionDb.setCollectionComparison({
            handle,
            production_id: productionCollection?.id ?? null,
            staging_id: stagingCollection?.id ?? null,
            title: (productionCollection || stagingCollection)?.title ?? '',
            differences: differences.join(', ') || 'In sync',
            updated_at: (productionCollection || stagingCollection)!.updatedAt,
            compared_at: new Date().toISOString(),
          });
        }

        await get().fetchStoredCollections();
        logger.info('Collection comparison completed successfully');
        set({ isLoading: false });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        logger.error('Failed to compare collections:', err);
      }
    },

    syncCollections: async (
      handles: string[],
      targetEnvironment: Environment
    ) => {
      set({ isLoading: true, error: null });
      try {
        const sourceEnvironment =
          targetEnvironment === 'production' ? 'staging' : 'production';

        for (const handle of handles) {
          // Sync the collection
          await syncCollectionToEnvironment(
            handle,
            sourceEnvironment,
            targetEnvironment
          );

          // Update the collection in state and database
          const collection = await collectionDb.getCollectionComparison(handle);
          if (collection) {
            // Update database
            await collectionDb.setCollectionComparison({
              ...collection,
              differences: 'In sync',
              compared_at: new Date().toISOString(),
            });

            // Update state
            set((state) => ({
              collections: state.collections.map((c) =>
                c.handle === handle
                  ? {
                      ...c,
                      differences: 'In sync',
                      compared_at: new Date().toISOString(),
                    }
                  : c
              ),
            }));
          }
        }

        set({ isLoading: false });
        logger.info(
          `Successfully synced ${handles.length} collections to ${targetEnvironment}`
        );
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        logger.error('Failed to sync collections:', err);
        throw err;
      }
    },

    fetchCollectionDetails: async (id: string, environment: Environment) => {
      set({ isLoadingDetails: true, error: null });
      try {
        const response = await shopifyApi.post<{
          collection: DetailedCollection;
        }>(environment, {
          query: print(COLLECTION_DETAILS_QUERY),
          variables: { id },
        });
        set({
          selectedCollection: response.collection,
          isLoadingDetails: false,
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errors?.[0]?.message ||
          'Failed to fetch collection details';
        set({ error: errorMessage, isLoadingDetails: false });
        logger.error('Error fetching collection details:', err);
      }
    },
  })
);
