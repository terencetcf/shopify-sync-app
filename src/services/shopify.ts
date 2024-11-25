import axios from 'axios';
import { print } from 'graphql';
import { BasicProduct, DetailedProduct } from '../types/product';
import { BasicCollection, DetailedCollection } from '../types/collection';
import {
  PRODUCTS_QUERY,
  PRODUCT_DETAILS_QUERY,
} from '../graphql/queries/products';
import {
  COLLECTIONS_QUERY,
  COLLECTION_DETAILS_QUERY,
} from '../graphql/queries/collections';
import { PAGES_QUERY, PAGE_DETAILS_QUERY } from '../graphql/queries/pages';

interface ProductsResponse {
  products: {
    edges: Array<{
      node: BasicProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface ProductResponse {
  node: DetailedProduct;
}

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: BasicCollection;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface CollectionResponse {
  node: DetailedCollection;
}

export const shopifyApi = {
  async fetchProducts(cursor?: string | null) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(PRODUCTS_QUERY),
        variables: { cursor },
      },
    });

    return data.data as ProductsResponse;
  },

  async fetchProductDetails(id: string) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(PRODUCT_DETAILS_QUERY),
        variables: { id },
      },
    });

    return data.data as ProductResponse;
  },

  async fetchCollections(cursor?: string | null) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(COLLECTIONS_QUERY),
        variables: { cursor },
      },
    });

    return data.data as CollectionsResponse;
  },

  async fetchCollectionDetails(id: string) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(COLLECTION_DETAILS_QUERY),
        variables: { id },
      },
    });

    return data.data as CollectionResponse;
  },

  async fetchPages(cursor?: string | null) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(PAGES_QUERY),
        variables: { cursor },
      },
    });

    return data.data;
  },

  async fetchPageDetails(id: string) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: print(PAGE_DETAILS_QUERY),
        variables: { id },
      },
    });

    return data.data;
  },
};
