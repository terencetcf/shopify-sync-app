import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { BasicProduct } from '../types/product';
import {
  PRODUCT_DETAILS_QUERY,
  PRODUCTS_QUERY,
} from '../graphql/queries/products';
import { print } from 'graphql';
import { PageInfo } from '../types/pageInfo';
import { DetailedProduct } from '../types/products';
import { logger } from '../utils/logger';

interface ProductsResponse {
  products: {
    edges: Array<{
      node: BasicProduct;
    }>;
    pageInfo: PageInfo;
  };
}

interface ProductResponse {
  node: DetailedProduct;
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

export const useProductsStore = create<ProductsStore>((set) => ({
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
      const response = await shopifyApi.post<ProductsResponse>('production', {
        query: print(PRODUCTS_QUERY),
        variables: { cursor },
      });
      const productsData = response.products.edges.map((edge) => edge.node);

      set((state) => ({
        products: cursor ? [...state.products, ...productsData] : productsData,
        hasNextPage: response.products.pageInfo.hasNextPage,
        endCursor: response.products.pageInfo.endCursor,
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({ error: errorMessage, isLoading: false });
      logger.error('Error fetching products:', err);
    }
  },

  fetchProductDetails: async (id: string) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await shopifyApi.post<ProductResponse>('production', {
        query: print(PRODUCT_DETAILS_QUERY),
        variables: { id },
      });
      set({
        selectedProduct: response.node,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch product details';
      set({ error: errorMessage, isLoadingDetails: false });
      logger.error('Error fetching product details:', err);
    }
  },
}));
