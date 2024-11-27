export interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  vendor: string;
  productType: string;
  updatedAt: string;
  descriptionHtml: string;
  templateSuffix: string | null;
  category: {
    id: string;
    name: string;
  };
  combinedListingRole: string;
  collections: {
    edges: Array<{
      node: {
        handle: string;
      };
    }>;
  };
  options: Array<{
    linkedMetafield: {
      key: string;
      namespace: string;
    };
    name: string;
    position: number;
    values: string[];
  }>;
  requiresSellingPlan: boolean;
  seo: {
    title: string;
    description: string;
  };
  tags: string[];
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
  isGiftCard: boolean;
  giftCardTemplateSuffix: string | null;
  media: {
    edges: Array<{
      node: {
        mediaContentType: string;
        status: string;
        preview: {
          image: {
            altText: string | null;
            url: string;
          };
        };
      };
    }>;
  };
}

export interface DetailedProduct {
  id: string;
  title: string;
  handle: string;
  templateSuffix: string | null;
  vendor: string;
  category: {
    id: string;
    name: string;
  };
  combinedListingRole: string;
  collections: {
    edges: Array<{
      node: {
        handle: string;
      };
    }>;
  };
  productType: string;
  options: Array<{
    linkedMetafield: {
      key: string;
      namespace: string;
    };
    name: string;
    position: number;
    values: string[];
  }>;
  requiresSellingPlan: boolean;
  seo: {
    title: string;
    description: string;
  };
  status: string;
  tags: string[];
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
  isGiftCard: boolean;
  giftCardTemplateSuffix: string | null;
  descriptionHtml: string;
  updatedAt: string;
  totalInventory: number;
  onlineStoreUrl: string;
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
        image: {
          id: string;
          url: string;
          altText: string;
          width: number;
          height: number;
        };
      };
    }>;
  };
  media: {
    edges: Array<{
      node: {
        mediaContentType: string;
        status: string;
        preview: {
          image: {
            altText: string | null;
            url: string;
          };
        };
      };
    }>;
  };
}
