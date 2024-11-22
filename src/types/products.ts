export interface ComparisonResult {
  handle: string;
  title: string;
  productionInventory: number | null;
  stagingInventory: number | null;
  status: 'missing_in_production' | 'missing_in_staging';
  updatedAt: string | null;
}
