import { Environment } from './environment';

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface CollectionComparison {
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedCollection {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  sortOrder: string;
  templateSuffix: string | null;
  image: {
    altText: string | null;
    url: string;
  } | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  productsCount: {
    count: number;
  };
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        totalInventory: number;
      };
    }>;
  };
}

export interface CollectionsSyncStore {
  collections: CollectionComparison[];
  selectedCollection: DetailedCollection | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  syncProgress: {
    current: number;
    total: number;
  } | null;
  fetchStoredCollections: () => Promise<void>;
  compareCollections: () => Promise<void>;
  syncCollections: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchCollectionDetails: (
    id: string,
    environment: Environment
  ) => Promise<void>;
}
