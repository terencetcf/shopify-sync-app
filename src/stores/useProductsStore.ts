import { create } from 'zustand';
import axios from 'axios';

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  updatedAt: string;
  vendor: string;
  productType: string;
}

interface ProductsConnection {
  edges: {
    node: Product;
    cursor: string;
  }[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
}

interface ProductResponse {
  data: {
    products: ProductsConnection;
  };
}

interface ProductsStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchProducts: (cursor?: string | null) => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set, get) => ({
  products: [],
  isLoading: false,
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
                    status
                    totalInventory
                    updatedAt
                    vendor
                    productType
                  }
                  cursor
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
        (edge: { node: Product }) => edge.node
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
}));
