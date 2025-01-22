import { Environment } from './environment';

export interface ShopifyFile {
  id: string;
  alt: string;
  preview: {
    image: {
      url: string;
    };
    status: string;
  };
}

export interface FileComparison {
  id: string;
  production_id: string | null;
  staging_id: string | null;
  alt: string;
  url: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedFile {
  id: string;
  alt: string;
  preview: {
    image: {
      url: string;
    };
    status: string;
  };
}

export interface FilesSyncStore {
  files: FileComparison[];
  selectedFile: DetailedFile | null;
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
  fetchStoredFiles: () => Promise<void>;
  compareFiles: () => Promise<void>;
  syncFiles: (ids: string[], targetEnvironment: Environment) => Promise<void>;
  fetchFileDetails: (id: string, environment: Environment) => Promise<void>;
}
