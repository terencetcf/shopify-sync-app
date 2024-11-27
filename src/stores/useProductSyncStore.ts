import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { print } from 'graphql';
import gql from 'graphql-tag';
import type { Product } from '../types/products';
import type { CompareDirection, ComparisonResult } from '../types/sync';

// Add this interface
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

interface ProductsSyncStore {
  productionProducts: Product[];
  stagingProducts: Product[];
  comparisonResults: ComparisonResult[];
  isLoading: boolean;
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  isStagingToProductionEnabled: boolean;
  setCompareDirection: (direction: CompareDirection) => void;
  fetchProducts: () => Promise<void>;
  resetComparison: () => void;
  syncProducts: (ids: string[], direction: CompareDirection) => Promise<void>;
  compareProducts: (direction: CompareDirection) => Promise<void>;
}

// Define the GraphQL query as a constant
const SYNC_PRODUCTS_QUERY = gql`
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
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

export const useProductSyncStore = create<ProductsSyncStore>((set, get) => ({
  productionProducts: [],
  stagingProducts: [],
  comparisonResults: [],
  isLoading: false,
  error: null,
  compareDirection: 'production_to_staging',
  hasCompared: false,
  isStagingToProductionEnabled: false,

  setCompareDirection: (direction) => set({ compareDirection: direction }),
  resetComparison: () => set({ hasCompared: false }),

  fetchProducts: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch production products
      const productionResponse = await shopifyApi.post<ProductsResponse>(
        'production',
        {
          query: print(SYNC_PRODUCTS_QUERY),
        }
      );

      // Fetch staging products
      const stagingResponse = await shopifyApi.post<ProductsResponse>(
        'staging',
        {
          query: print(SYNC_PRODUCTS_QUERY),
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
      console.error('Error fetching products:', err);
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

      // Process selected products
      for (const id of ids) {
        const sourceProduct = sourceProducts.find((prod) => prod.id === id);
        if (!sourceProduct) continue;

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

        if (existingProduct) {
          // Update existing product
          await shopifyApi.post(targetEnvironment, {
            query: print(gql`
              mutation UpdateProductWithNewMedia($input: ProductInput!) {
                productUpdate(input: $input) {
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
            `),
            variables: {
              input: {
                id: existingProduct.id,
                handle: sourceProduct.handle,
                title: sourceProduct.title,
                templateSuffix: sourceProduct.templateSuffix,
                vendor: sourceProduct.vendor,
                category: sourceProduct.category,
                combinedListingRole: sourceProduct.combinedListingRole,
                productType: sourceProduct.productType,
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
              },
            },
          });
        } else {
          // Create new product
          await shopifyApi.post(targetEnvironment, {
            query: print(gql`
              mutation createProduct($input: ProductInput!) {
                productCreate(input: $input) {
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
            `),
            variables: {
              input: {
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

      set({ isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to sync products';
      set({ error: errorMessage, isLoading: false });
      console.error('Error syncing products:', err);
      throw err;
    }
  },

  compareProducts: async (direction: CompareDirection) => {
    set({ isLoading: true, error: null });
    try {
      await get().fetchProducts();

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
      });
    } catch (err: any) {
      set({ error: 'Failed to compare products', isLoading: false });
      console.error('Error comparing products:', err);
    }
  },
}));
