export interface ComparisonResult {
  id: string;
  handle: string;
  title: string;
  status: 'missing_in_staging' | 'missing_in_production';
  updatedAt: string | null;
}
