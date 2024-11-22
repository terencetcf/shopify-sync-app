export interface BasicProduct {
  id: string;
  title: string;
  handle: string;
  productType: string;
  updatedAt: string;
}

export interface DetailedProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  vendor: string;
  productType: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  onlineStoreUrl: string;
  options: Array<{
    name: string;
    values: string[];
  }>;
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
  tags: string[];
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
      };
    }>;
  };
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
      };
    }>;
  };
}
