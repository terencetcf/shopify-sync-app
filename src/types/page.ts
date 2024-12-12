import { Environment } from './environment';

export interface ShopifyPage {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface PageComparison {
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedPage {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  body: string;
  bodySummary: string;
  isPublished: boolean;
  publishedAt: string | null;
  templateSuffix: string | null;
  metafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
        type: string;
      };
    }>;
  };
}

export interface PagesSyncStore {
  pages: PageComparison[];
  selectedPage: DetailedPage | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  syncProgress: {
    current: number;
    total: number;
  } | null;
  compareProgress: {
    current: number;
    total: number;
  } | null;
  fetchStoredPages: () => Promise<void>;
  comparePages: () => Promise<void>;
  syncPages: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchPageDetails: (id: string, environment: Environment) => Promise<void>;
}
