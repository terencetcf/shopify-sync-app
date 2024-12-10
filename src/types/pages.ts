import type { ComparisonResult as BaseComparisonResult } from './sync';

export interface PageDetails {
  id: string;
  title: string;
  handle: string;
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

export interface ComparisonResult extends BaseComparisonResult {
  production_id?: string;
  staging_id?: string;
  title: string;
  handle: string;
  differences?: string[];
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
  bodySummary: string;
}
