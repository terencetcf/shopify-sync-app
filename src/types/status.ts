export interface StatusFilterOption {
  id: string;
  label: string;
}

export const STATUS_FILTER_OPTIONS: readonly StatusFilterOption[] = [
  { id: 'missing_staging', label: 'Missing in Staging' },
  { id: 'missing_production', label: 'Missing in Production' },
  { id: 'has_differences', label: 'Has differences' },
  { id: 'in_sync', label: 'In sync' },
] as const;
