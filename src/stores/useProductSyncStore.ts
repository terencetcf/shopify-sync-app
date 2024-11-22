import { create } from 'zustand';
import axios from 'axios';

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  vendor: string;
  productType: string;
  updatedAt: string;
}

type CompareDirection = 'production_to_staging' | 'staging_to_production';

interface ProductsSyncStore {
  productionProducts: Product[];
  stagingProducts: Product[];
  isLoadingProduction: boolean;
  isLoadingStaging: boolean;
  error: string | null;
  compareDirection: CompareDirection;
  hasCompared: boolean;
  isStagingToProductionEnabled: boolean;
  setCompareDirection: (direction: CompareDirection) => void;
  fetchProducts: () => Promise<void>;
  resetComparison: () => void;
  syncProducts: (
    handles: string[],
    direction: CompareDirection
  ) => Promise<void>;
}

export const useProductSyncStore = create<ProductsSyncStore>((set, get) => ({
  productionProducts: [],
  stagingProducts: [],
  isLoadingProduction: false,
  isLoadingStaging: false,
  error: null,
  compareDirection: 'production_to_staging',
  hasCompared: false,
  isStagingToProductionEnabled: false,

  setCompareDirection: (direction) => set({ compareDirection: direction }),
  resetComparison: () => set({ hasCompared: false }),

  fetchProducts: async () => {
    set({ isLoadingProduction: true, isLoadingStaging: true, error: null });

    try {
      // Fetch production products
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
              products(first: 250) {
                edges {
                  node {
                    id
                    title
                    handle
                    status
                    totalInventory
                    vendor
                    productType
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      // Fetch staging products
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
              products(first: 250) {
                edges {
                  node {
                    id
                    title
                    handle
                    status
                    totalInventory
                    vendor
                    productType
                    updatedAt
                  }
                }
              }
            }
          `,
        },
      });

      const productionProducts =
        productionResponse.data.data.products.edges.map(
          (edge: { node: Product }) => edge.node
        );

      const stagingProducts = stagingResponse.data.data.products.edges.map(
        (edge: { node: Product }) => edge.node
      );

      set({
        productionProducts,
        stagingProducts,
        isLoadingProduction: false,
        isLoadingStaging: false,
        hasCompared: true,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({
        error: errorMessage,
        isLoadingProduction: false,
        isLoadingStaging: false,
      });
      console.error('Error fetching products:', err);
    }
  },

  syncProducts: async (handles: string[], direction: CompareDirection) => {
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

      // Fetch full product details from source
      const sourceResponse = await axios({
        url: sourceUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': sourceToken,
        },
        data: {
          query: `
            query getProductDetails($handle: String!) {
              productByHandle(handle: $handle) {
                title
                handle
                descriptionHtml
                vendor
                productType
                status
                variants(first: 100) {
                  edges {
                    node {
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      inventoryPolicy
                    }
                  }
                }
                options {
                  name
                  values
                }
                images(first: 100) {
                  edges {
                    node {
                      src
                      altText
                    }
                  }
                }
              }
            }
          `,
          variables: {
            handle: handles[0], // Process one product at a time
          },
        },
      });

      const productDetails = sourceResponse.data.data.productByHandle;

      // Create product in target environment
      await axios({
        url: targetUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': targetToken,
        },
        data: {
          query: `
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
          `,
          variables: {
            input: {
              handle: productDetails.handle,
              title: productDetails.title,
              descriptionHtml: productDetails.descriptionHtml,
              vendor: productDetails.vendor,
              productType: productDetails.productType,
              status: productDetails.status,
              options: productDetails.options,
              variants: productDetails.variants.edges.map((edge: any) => ({
                title: edge.node.title,
                sku: edge.node.sku,
                price: edge.node.price,
                compareAtPrice: edge.node.compareAtPrice,
                inventoryQuantity: edge.node.inventoryQuantity,
                inventoryPolicy: edge.node.inventoryPolicy,
              })),
              images: productDetails.images.edges.map((edge: any) => ({
                src: edge.node.src,
                altText: edge.node.altText,
              })),
            },
          },
        },
      });

      // Refresh products after sync
      await get().fetchProducts();
    } catch (err: any) {
      console.error('Error syncing products:', err);
      throw new Error(
        err.response?.data?.errors?.[0]?.message || 'Failed to sync products'
      );
    }
  },
}));
