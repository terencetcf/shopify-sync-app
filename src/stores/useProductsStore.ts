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

interface ProductResponse {
  data: {
    products: {
      edges: {
        node: Product;
      }[];
    };
  };
}

interface ProductsStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
}

export const useProductsStore = create<ProductsStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async () => {
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
            query {
              products(first: 100) {
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
                }
              }
            }
          `,
        },
      });

      const productsData = data.data.products.edges.map(
        (edge: { node: Product }) => edge.node
      );

      set({ products: productsData, isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching products:', err);
    }
  },
}));
