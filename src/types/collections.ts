export interface ComparisonResult {
  id: string;
  handle: string;
  title: string;
  status: 'missing_in_staging' | 'missing_in_production' | 'different';
  differences?: string[];
  updatedAt: string | null;
  productionCount?: {
    count: number;
    precision: number;
  } | null;
  stagingCount?: {
    count: number;
    precision: number;
  } | null;
}

export interface CollectionDetails {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  updatedAt: string;
  sortOrder: string;
  templateSuffix: string | null;
  image?: {
    id: string;
    url: string;
    altText: string | null;
  };
  seo?: {
    title: string;
    description: string;
  };
  productsCount?: {
    count: number;
    precision: number;
  };
}
