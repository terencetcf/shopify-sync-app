import { create } from 'zustand';
import axios from 'axios';

// Basic product type for table view
export interface BasicProduct {
  id: string;
  title: string;
  handle: string;
  productType: string;
  updatedAt: string;
}

// Full product type for details panel
export interface DetailedProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  vendor: string;
  productType: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  onlineStoreUrl: string;
  options: Array<{
    name: string;
    values: string[];
  }>;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  tags: string[];
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string;
        price: string;
        compareAtPrice: string;
        inventoryQuantity: number;
        selectedOptions: Array<{
          name: string;
          value: string;
        }>;
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
      };
    }>;
  };
}

interface ProductsStore {
  products: BasicProduct[];
  selectedProduct: DetailedProduct | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchProducts: (cursor?: string | null) => Promise<void>;
  fetchProductDetails: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  hasNextPage: false,
  endCursor: null,
  fetchProducts: async (cursor?: string | null) => {
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
            query getProducts($cursor: String) {
              products(first: 25, after: $cursor) {
                edges {
                  node {
                    id
                    title
                    handle
                    productType
                    updatedAt
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          `,
          variables: {
            cursor: cursor,
          },
        },
      });

      const productsData = data.data.products.edges.map(
        (edge: { node: BasicProduct }) => edge.node
      );

      set((state) => ({
        products: cursor ? [...state.products, ...productsData] : productsData,
        hasNextPage: data.data.products.pageInfo.hasNextPage,
        endCursor: data.data.products.pageInfo.endCursor,
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching products:', err);
    }
  },
  fetchProductDetails: async (id: string) => {
    set({ isLoadingDetails: true, error: null });

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
            query getProduct($id: ID!) {
              node(id: $id) {
                ... on Product {
                  id
                  title
                  handle
                  status
                  description
                  descriptionHtml
                  onlineStoreUrl
                  options {
                    id
                    name
                    position
                    values
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                    maxVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                  productType
                  publishedAt
                  tags
                  templateSuffix
                  title
                  totalInventory
                  tracksInventory
                  updatedAt
                  vendor
                  variants(first: 100) {
                    edges {
                      node {
                        id
                        title
                        sku
                        price
                        compareAtPrice
                        inventoryQuantity
                        selectedOptions {
                          name
                          value
                        }
                        image {
                          id
                          url
                          altText
                          width
                          height
                        }
                      }
                    }
                  }
                  images(first: 10) {
                    edges {
                      node {
                        id
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                  seo {
                    title
                    description
                  }
                  metafields(first: 10) {
                    edges {
                      node {
                        id
                        namespace
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          `,
          variables: {
            id: id,
          },
        },
      });

      set({
        selectedProduct: data.data.node,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch product details';
      set({ error: errorMessage, isLoadingDetails: false });
      console.error('Error fetching product details:', err);
    }
  },
}));
