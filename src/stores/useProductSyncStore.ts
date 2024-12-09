import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { print } from 'graphql';
import gql from 'graphql-tag';
import type { Product } from '../types/products';
import type {
  CompareDirection,
  ComparisonResult,
  Environment,
} from '../types/sync';
import { logger } from '../utils/logger';

interface ProductsResponse {
  products: {
    edges: Array<{
      node: Product;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
      };
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  };
}

interface ProductsSyncStore {
  productionProducts: Product[];
  stagingProducts: Product[];
  comparisonResults: ComparisonResult[];
  isLoading: boolean;
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  resultsDirection: CompareDirection | null;
  targetCollectionsMap: Map<string, string>;
  setCompareDirection: (direction: CompareDirection) => void;
  fetchProducts: () => Promise<void>;
  resetComparison: () => void;
  syncProducts: (ids: string[], direction: CompareDirection) => Promise<void>;
  compareProducts: (direction: CompareDirection) => Promise<void>;
}

const GET_PRODUCTS_QUERY = gql`
  query {
    products(first: 25) {
      edges {
        node {
          id
          handle
          title
          templateSuffix
          vendor
          category {
            id
            name
          }
          combinedListingRole
          collections(first: 250) {
            edges {
              node {
                handle
              }
            }
          }
          productType
          options {
            linkedMetafield {
              key
              namespace
            }
            name
            position
            values
          }
          requiresSellingPlan
          seo {
            title
            description
          }
          status
          tags
          metafields(first: 250) {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
          isGiftCard
          giftCardTemplateSuffix
          descriptionHtml
          updatedAt
          media(first: 250) {
            edges {
              node {
                mediaContentType
                status
                preview {
                  image {
                    altText
                    url
                  }
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

// Update the query to include cursor and pageInfo
const GET_COLLECTIONS_QUERY = gql`
  query getCollections($cursor: String) {
    collections(first: 250, after: $cursor) {
      edges {
        node {
          id
          handle
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Update the mutations to include collections
const UPDATE_PRODUCT_MUTATION = gql`
  mutation updateProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
    productUpdate(input: $input, media: $media) {
      product {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CREATE_PRODUCT_MUTATION = gql`
  mutation createProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
    productCreate(input: $input, media: $media) {
      product {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const getCollectionIds = async (
  environment: Environment
): Promise<Map<string, string>> => {
  const collectionsMap = new Map<string, string>();
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const response: CollectionsResponse =
      await shopifyApi.post<CollectionsResponse>(environment, {
        query: print(GET_COLLECTIONS_QUERY),
        variables: { cursor },
      });

    response.collections.edges.forEach((edge) => {
      collectionsMap.set(edge.node.handle, edge.node.id);
    });

    hasNextPage = response.collections.pageInfo.hasNextPage;
    cursor = response.collections.pageInfo.endCursor;
  }

  return collectionsMap;
};

export const useProductSyncStore = create<ProductsSyncStore>((set, get) => ({
  productionProducts: [],
  stagingProducts: [],
  comparisonResults: [],
  isLoading: false,
  error: null,
  compareDirection: 'production_to_staging',
  hasCompared: false,
  resultsDirection: null,
  targetCollectionsMap: new Map(),

  setCompareDirection: (direction) => {
    set({
      compareDirection: direction,
      comparisonResults:
        get().resultsDirection === direction ? get().comparisonResults : [],
      hasCompared:
        get().resultsDirection === direction ? get().hasCompared : false,
      targetCollectionsMap: new Map(),
    });
  },

  resetComparison: () =>
    set({
      hasCompared: false,
      comparisonResults: [],
      resultsDirection: null,
      targetCollectionsMap: new Map(),
    }),

  fetchProducts: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch production products
      const productionResponse = await shopifyApi.post<ProductsResponse>(
        'production',
        {
          query: print(GET_PRODUCTS_QUERY),
        }
      );

      // Fetch staging products
      const stagingResponse = await shopifyApi.post<ProductsResponse>(
        'staging',
        {
          query: print(GET_PRODUCTS_QUERY),
        }
      );

      const productionProducts = productionResponse.products.edges.map(
        (edge: { node: Product }) => edge.node
      );

      const stagingProducts = stagingResponse.products.edges.map(
        (edge: { node: Product }) => edge.node
      );

      set({
        productionProducts,
        stagingProducts,
        isLoading: false,
        hasCompared: true,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({ error: errorMessage, isLoading: false });
      logger.error('Error fetching products:', err);
    }
  },

  syncProducts: async (ids: string[], direction: CompareDirection) => {
    set({ isLoading: true, error: null });
    try {
      const sourceProducts =
        direction === 'production_to_staging'
          ? get().productionProducts
          : get().stagingProducts;

      const targetEnvironment =
        direction === 'production_to_staging' ? 'staging' : 'production';
      const collectionsMap = get().targetCollectionsMap;

      // Process selected products
      for (const id of ids) {
        const sourceProduct = sourceProducts.find((prod) => prod.id === id);
        if (!sourceProduct) continue;

        // Get collection handles from source product
        const collectionHandles = sourceProduct.collections.edges.map(
          (edge) => edge.node.handle
        );

        // Use stored collection IDs mapping
        const collectionIds = collectionHandles
          .map((handle) => collectionsMap.get(handle))
          .filter((id): id is string => id !== undefined);

        // Check if product exists in target
        const targetCheckResponse = await shopifyApi.post(targetEnvironment, {
          query: print(gql`
            query getProductByHandle($handle: String!) {
              products(first: 1, query: $handle) {
                edges {
                  node {
                    id
                    handle
                  }
                }
              }
            }
          `),
          variables: {
            handle: `handle:${sourceProduct.handle}`,
          },
        });

        const existingProduct = targetCheckResponse.products.edges[0]?.node;

        const productInput = {
          handle: sourceProduct.handle,
          title: sourceProduct.title,
          templateSuffix: sourceProduct.templateSuffix,
          vendor: sourceProduct.vendor,
          category: sourceProduct.category,
          combinedListingRole: sourceProduct.combinedListingRole,
          productType: sourceProduct.productType,
          productOptions: sourceProduct.options?.map((option) => ({
            name: option.name,
            position: option.position,
            values: option.values.map((value) => ({ name: value })),
            linkedMetafield: option.linkedMetafield,
          })),
          requiresSellingPlan: sourceProduct.requiresSellingPlan,
          seo: sourceProduct.seo,
          status: sourceProduct.status,
          tags: sourceProduct.tags,
          metafields: sourceProduct.metafields?.edges.map((edge) => ({
            namespace: edge.node.namespace,
            key: edge.node.key,
            value: edge.node.value,
            type: edge.node.type,
          })),
          giftCard: sourceProduct.isGiftCard,
          giftCardTemplateSuffix: sourceProduct.giftCardTemplateSuffix,
          descriptionHtml: sourceProduct.descriptionHtml,
          collectionsToJoin: collectionIds,
        };
        // const mediaInput = sourceProduct.media.edges.map(({ node }) => ({
        //   alt: node.preview.image.altText || '',
        //   mediaContentType: node.mediaContentType,
        //   originalSource: node.preview.image.url,
        // }));

        if (existingProduct) {
          await shopifyApi.post(targetEnvironment, {
            query: print(UPDATE_PRODUCT_MUTATION),
            variables: {
              input: {
                id: existingProduct.id,
                ...productInput,
              },
              // media: mediaInput,
            },
          });
        } else {
          await shopifyApi.post(targetEnvironment, {
            query: print(CREATE_PRODUCT_MUTATION),
            variables: {
              input: productInput,
              // media: mediaInput,
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

      set({ isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to sync products';
      set({ error: errorMessage, isLoading: false });
      logger.error('Error syncing products:', err);
      throw err;
    }
  },

  compareProducts: async (direction: CompareDirection) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch products
      await get().fetchProducts();

      // Fetch and store collection IDs mapping for target environment
      const targetEnvironment =
        direction === 'production_to_staging' ? 'staging' : 'production';
      const collectionsMap = await getCollectionIds(targetEnvironment);
      set({ targetCollectionsMap: collectionsMap });

      const sourceProducts =
        direction === 'production_to_staging'
          ? get().productionProducts
          : get().stagingProducts;

      const targetProducts =
        direction === 'production_to_staging'
          ? get().stagingProducts
          : get().productionProducts;

      const results: ComparisonResult[] = [];

      sourceProducts.forEach((sourceProduct) => {
        const targetProduct = targetProducts.find(
          (target) => target.handle === sourceProduct.handle
        );

        if (!targetProduct) {
          results.push({
            id: sourceProduct.id,
            handle: sourceProduct.handle,
            title: sourceProduct.title,
            status:
              direction === 'production_to_staging'
                ? 'missing_in_staging'
                : 'missing_in_production',
            updatedAt: sourceProduct.updatedAt,
          });
        } else {
          // Check for differences in all specified fields
          const differences: string[] = [];

          // Basic fields comparison
          if (sourceProduct.title !== targetProduct.title)
            differences.push('title');
          if (sourceProduct.templateSuffix !== targetProduct.templateSuffix)
            differences.push('templateSuffix');
          if (sourceProduct.vendor !== targetProduct.vendor)
            differences.push('vendor');
          if (sourceProduct.productType !== targetProduct.productType)
            differences.push('productType');
          if (sourceProduct.status !== targetProduct.status)
            differences.push('status');
          if (sourceProduct.descriptionHtml !== targetProduct.descriptionHtml)
            differences.push('descriptionHtml');
          if (sourceProduct.isGiftCard !== targetProduct.isGiftCard)
            differences.push('isGiftCard');
          if (
            sourceProduct.giftCardTemplateSuffix !==
            targetProduct.giftCardTemplateSuffix
          )
            differences.push('giftCardTemplateSuffix');
          if (
            sourceProduct.requiresSellingPlan !==
            targetProduct.requiresSellingPlan
          )
            differences.push('requiresSellingPlan');
          if (
            sourceProduct.combinedListingRole !==
            targetProduct.combinedListingRole
          )
            differences.push('combinedListingRole');

          // Category comparison
          if (sourceProduct.category?.name !== targetProduct.category?.name)
            differences.push('category');

          // SEO comparison
          if (
            sourceProduct.seo?.title !== targetProduct.seo?.title ||
            sourceProduct.seo?.description !== targetProduct.seo?.description
          ) {
            differences.push('seo');
          }

          // Tags comparison (order doesn't matter)
          if (
            JSON.stringify([...sourceProduct.tags].sort()) !==
            JSON.stringify([...targetProduct.tags].sort())
          ) {
            differences.push('tags');
          }

          // Metafields comparison
          const sourceMetafields = sourceProduct.metafields?.edges || [];
          const targetMetafields = targetProduct.metafields?.edges || [];

          const metafieldsMatch = sourceMetafields.every((sourceEdge) => {
            const sourceNode = sourceEdge.node;
            return targetMetafields.some((targetEdge) => {
              const targetNode = targetEdge.node;
              return (
                sourceNode.namespace === targetNode.namespace &&
                sourceNode.key === targetNode.key &&
                sourceNode.value === targetNode.value &&
                sourceNode.type === targetNode.type
              );
            });
          });

          if (
            !metafieldsMatch ||
            sourceMetafields.length !== targetMetafields.length
          ) {
            differences.push('metafields');
          }

          if (differences.length > 0) {
            results.push({
              id: sourceProduct.id,
              handle: sourceProduct.handle,
              title: sourceProduct.title,
              status: 'different',
              differences,
              updatedAt: sourceProduct.updatedAt,
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
        error: 'Failed to compare products',
        isLoading: false,
        resultsDirection: null,
        targetCollectionsMap: new Map(),
      });
      logger.error('Error comparing products:', err);
    }
  },
}));
