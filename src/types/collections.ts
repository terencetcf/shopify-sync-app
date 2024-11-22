export interface ComparisonResult {
  handle: string;
  title: string;
  productionCount: number | null;
  stagingCount: number | null;
  status: 'missing_in_production' | 'missing_in_staging';
  updatedAt: string | null;
}
