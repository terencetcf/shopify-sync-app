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
}
