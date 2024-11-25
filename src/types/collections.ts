export interface ComparisonResult {
  handle: string;
  title: string;
  productionCount: {
    count: number;
    precision: number;
  } | null;
  stagingCount: {
    count: number;
    precision: number;
  } | null;
  status: 'missing_in_production' | 'missing_in_staging';
  updatedAt: string | null;
}
