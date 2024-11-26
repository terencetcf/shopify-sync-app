import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { BasicCollection, DetailedCollection } from '../types/collection';
import {
  COLLECTION_DETAILS_QUERY,
  COLLECTIONS_QUERY,
} from '../graphql/queries/collections';
import { print } from 'graphql';
import { PageInfo } from '../types/pageInfo';

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: BasicCollection;
    }>;
    pageInfo: PageInfo;
  };
}

interface CollectionResponse {
  node: DetailedCollection;
}

interface CollectionsStore {
  collections: BasicCollection[];
  selectedCollection: DetailedCollection | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  hasNextPage: boolean;
  endCursor: string | null;
  fetchCollections: (cursor?: string | null) => Promise<void>;
  fetchCollectionDetails: (id: string) => Promise<void>;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
  collections: [],
  selectedCollection: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  hasNextPage: false,
  endCursor: null,

  fetchCollections: async (cursor?: string | null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await shopifyApi.post<CollectionsResponse>(
        'production',
        {
          query: print(COLLECTIONS_QUERY),
          variables: { cursor },
        }
      );
      const collectionsData = response.collections.edges.map(
        (edge) => edge.node
      );

      set((state) => ({
        collections: cursor
          ? [...state.collections, ...collectionsData]
          : collectionsData,
        hasNextPage: response.collections.pageInfo.hasNextPage,
        endCursor: response.collections.pageInfo.endCursor,
        isLoading: false,
      }));
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch collections';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching collections:', err);
    }
  },

  fetchCollectionDetails: async (id: string) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await shopifyApi.post<CollectionResponse>('production', {
        query: print(COLLECTION_DETAILS_QUERY),
        variables: { id },
      });
      set({
        selectedCollection: response.node,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch collection details';
      set({ error: errorMessage, isLoadingDetails: false });
      console.error('Error fetching collection details:', err);
    }
  },
}));
