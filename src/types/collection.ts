export interface BasicCollection {
  id: string;
  title: string;
  handle: string;
  productsCount: number;
  updatedAt: string;
}

export interface DetailedCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  productsCount: number;
  updatedAt: string;
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
