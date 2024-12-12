import { Environment } from './environment';

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface ProductComparison {
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedProduct {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string[];
  isGiftCard: boolean;
  giftCardTemplateSuffix?: string;
  templateSuffix?: string;
  requiresSellingPlan: boolean;
  combinedListingRole?: string;
  category?: {
    name: string;
  };
  seo?: {
    title: string;
    description: string;
  };
  options?: Array<{
    name: string;
    position: number;
    values: string[];
    linkedMetafield?: {
      namespace: string;
      key: string;
    };
  }>;
  media?: {
    edges: Array<{
      node: {
        mediaContentType: string;
        status: string;
        preview?: {
          image?: {
            url: string;
            altText: string;
          };
        };
      };
    }>;
  };
  collections: {
    edges: Array<{
      node: {
        handle: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number;
      };
    }>;
  };
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

export interface ProductsSyncStore {
  products: ProductComparison[];
  selectedProduct: DetailedProduct | null;
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
  fetchStoredProducts: () => Promise<void>;
  compareProducts: () => Promise<void>;
  syncProducts: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchProductDetails: (id: string, environment: Environment) => Promise<void>;
}
