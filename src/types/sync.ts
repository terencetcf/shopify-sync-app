export type CompareDirection =
  | 'production_to_staging'
  | 'staging_to_production';

export type Environment = 'production' | 'staging';

export interface ComparisonResult {
  id: string;
  handle: string;
  title: string;
  status: 'missing_in_staging' | 'missing_in_production' | 'different';
  differences?: string[];
  updatedAt: string | null;
  // Optional fields for specific types
  productionInventory?: number | null;
  stagingInventory?: number | null;
  // Collection-specific fields
  productionCount?: number | null;
  stagingCount?: number | null;
}
