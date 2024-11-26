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
  ruleSet?: {
    rules: Array<{
      column: string;
      relation: string;
      condition: string;
    }>;
  };
  sortOrder: string;
  publishedAt: string | null;
  templateSuffix: string | null;
  updatedAt: string;
  productsCount?: {
    count: number;
    precision: number;
  };
}
