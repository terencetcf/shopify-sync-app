import { print } from 'graphql';
import { shopifyApi } from './shopify';
import { Environment } from '../types/environment';
import { logger } from '../utils/logger';
import { DetailedCollection, ShopifyCollection } from '../types/collection';
import {
  COLLECTIONS_QUERY,
  COLLECTION_DETAILS_QUERY,
  CREATE_COLLECTION_MUTATION,
  UPDATE_COLLECTION_MUTATION,
  COLLECTION_ADD_PRODUCTS_MUTATION,
} from '../graphql/collections';
import { collectionDb } from './collectionDb';
import { productDb } from './productDb';
import { compareField } from '../utils/compareUtils';

interface CollectionResponse {
  collections: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
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

interface CollectionAddProductsResponse {
  collectionAddProducts: {
    collection: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export async function fetchAllCollections(
  environment: Environment
): Promise<ShopifyCollection[]> {
  const collections: ShopifyCollection[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response: CollectionResponse =
        await shopifyApi.post<CollectionResponse>(environment, {
          query: print(COLLECTIONS_QUERY),
          variables: { cursor },
        });

      collections.push(...response.collections.edges.map(({ node }) => node));
      hasNextPage = response.collections.pageInfo.hasNextPage;
      cursor = response.collections.pageInfo.endCursor;

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching collections for ${environment}:`, err);
      throw err;
    }
  }

  return collections;
}

export async function fetchCollectionDetails(
  environment: Environment,
  id: string
): Promise<DetailedCollection> {
  try {
    const response = await shopifyApi.post<{ collection: DetailedCollection }>(
      environment,
      {
        query: print(COLLECTION_DETAILS_QUERY),
        variables: { id },
      }
    );
    return response.collection;
  } catch (err) {
    logger.error(
      `Error fetching collection details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

export async function compareCollectionDetails(
  productionCollection: DetailedCollection,
  stagingCollection: DetailedCollection
): Promise<string[]> {
  const differences: string[] = [];

  // Compare basic fields
  compareField(
    'Title',
    productionCollection.title,
    stagingCollection.title,
    differences
  );
  compareField(
    'Description',
    productionCollection.description,
    stagingCollection.description,
    differences
  );
  compareField(
    'HTML description',
    productionCollection.descriptionHtml,
    stagingCollection.descriptionHtml,
    differences
  );
  compareField(
    'Sort order',
    productionCollection.sortOrder,
    stagingCollection.sortOrder,
    differences
  );
  compareField(
    'Template suffix',
    productionCollection.templateSuffix,
    stagingCollection.templateSuffix,
    differences
  );

  // Compare image alt text
  if (
    productionCollection.image?.altText !== stagingCollection.image?.altText
  ) {
    differences.push('Image alt text');
    logger.info(
      'Image alt text mismatch',
      productionCollection.image?.altText,
      stagingCollection.image?.altText
    );
  }

  // Compare SEO fields
  compareField(
    'SEO title',
    productionCollection.seo?.title,
    stagingCollection.seo?.title,
    differences
  );
  compareField(
    'SEO description',
    productionCollection.seo?.description,
    stagingCollection.seo?.description,
    differences
  );

  return differences;
}

export async function syncCollectionToEnvironment(
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
      collection[sourceId]!
    );

    // Get product IDs from source collection and map them in parallel
    const sourceProductHandles = sourceDetails.products.edges.map(
      ({ node }) => node.handle
    );

    const targetProductIds = await Promise.all(
      sourceProductHandles.map(async (productHandle) => {
        const productComparison = await productDb.getProductComparison(
          productHandle
        );
        if (!productComparison?.[targetId]) {
          throw new Error(
            `Product ${productHandle} not found in ${targetEnvironment}!`
          );
        }
        return productComparison[targetId]!;
      })
    );

    // Prepare base collection input (without products)
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
    };

    let targetCollectionId: string;

    if (collection[targetId]) {
      // Update existing collection
      const response = await shopifyApi.post<CollectionUpdateResponse>(
        targetEnvironment,
        {
          query: print(UPDATE_COLLECTION_MUTATION),
          variables: {
            input: {
              id: collection[targetId],
              ...input,
            },
          },
        }
      );

      if (response.collectionUpdate?.userErrors?.length > 0) {
        throw new Error(response.collectionUpdate.userErrors[0].message);
      }

      targetCollectionId = collection[targetId]!;
    } else {
      // Create new collection
      const response = await shopifyApi.post<CollectionCreateResponse>(
        targetEnvironment,
        {
          query: print(CREATE_COLLECTION_MUTATION),
          variables: { input },
        }
      );

      if (response.collectionCreate?.userErrors?.length > 0) {
        throw new Error(response.collectionCreate.userErrors[0].message);
      }

      targetCollectionId = response.collectionCreate.collection!.id;
    }

    // Handle products
    if (targetProductIds.length > 0) {
      // First, fetch existing products in the target collection
      const targetCollection = await fetchCollectionDetails(
        targetEnvironment,
        targetCollectionId
      );

      // Filter out products that are already in the collection
      const existingProductIds = new Set(
        targetCollection.products.edges.map((edge) => edge.node.id)
      );
      const productsToAdd = targetProductIds.filter(
        (id) => !existingProductIds.has(id)
      );

      // Add only new products
      if (productsToAdd.length > 0) {
        const addProductsResponse =
          await shopifyApi.post<CollectionAddProductsResponse>(
            targetEnvironment,
            {
              query: print(COLLECTION_ADD_PRODUCTS_MUTATION),
              variables: {
                id: targetCollectionId,
                productIds: productsToAdd,
              },
            }
          );

        if (addProductsResponse.collectionAddProducts?.userErrors?.length > 0) {
          throw new Error(
            addProductsResponse.collectionAddProducts.userErrors[0].message
          );
        }
      }
    }

    logger.info(
      `Successfully synced collection ${handle} to ${targetEnvironment}`
    );
  } catch (err) {
    logger.error(
      `Failed to sync collection ${handle} to ${targetEnvironment}:`,
      err
    );
    throw err;
  }
}
