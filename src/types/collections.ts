import type { ComparisonResult } from './sync';

export interface CollectionDetails {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  sortOrder: string;
  descriptionHtml: string;
  templateSuffix: string | null;
  productsCount?: number;
  image?: {
    id: string;
    url: string;
    altText: string | null;
  };
  seo?: {
    title: string;
    description: string;
  };
}

export interface CollectionSyncDetails extends ComparisonResult {
  productionCount?: number | null;
  stagingCount?: number | null;
}
