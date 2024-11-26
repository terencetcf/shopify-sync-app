import { useEffect, useState } from 'react';
import { useProductSyncStore } from '../stores/useProductSyncStore';
import {
  ComparisonTable,
  DirectionSelector,
  SyncButton,
  ExportButton,
} from '../components/ProductsSync';

export default function ProductsSync() {
  const {
    comparisonResults,
    isLoading,
    error,
    compareDirection,
    hasCompared,
    isStagingToProductionEnabled,
    setCompareDirection,
    compareProducts,
    syncProducts,
    resetComparison,
  } = useProductSyncStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Reset selected items when direction changes
  useEffect(() => {
    setSelectedItems(new Set());
    resetComparison();
  }, [compareDirection, resetComparison]);

  const handleCompare = async () => {
    setSelectedItems(new Set());
    await compareProducts(compareDirection);
  };

  const handleSync = async () => {
    try {
      await syncProducts(Array.from(selectedItems), compareDirection);
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Error syncing products:', err);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === comparisonResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(comparisonResults.map((result) => result.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(id)) {
      newSelectedItems.delete(id);
    } else {
      newSelectedItems.add(id);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleExport = () => {
    // Convert comparison results to CSV
    const csvContent = [
      ['Title', 'Handle', 'Status', 'Last Updated'].join(','),
      ...comparisonResults.map((result) =>
        [
          `"${result.title}"`,
          result.handle,
          result.status === 'different'
            ? `Different (${result.differences?.join(', ')})`
            : result.status === 'missing_in_staging'
            ? 'Missing in Staging'
            : 'Missing in Production',
          result.updatedAt
            ? new Date(result.updatedAt).toLocaleDateString()
            : '',
        ].join(',')
      ),
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_comparison_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
  };

  const isSyncDisabled =
    compareDirection === 'staging_to_production' &&
    !isStagingToProductionEnabled;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-200">
            Products Sync
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Compare and sync products between production and staging
            environments.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <DirectionSelector
              value={compareDirection}
              onChange={setCompareDirection}
              isStagingToProductionEnabled={isStagingToProductionEnabled}
            />
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Comparing...' : 'Compare'}
            </button>
          </div>

          {hasCompared && comparisonResults.length > 0 && (
            <div className="flex items-center space-x-4">
              <ExportButton
                onExport={handleExport}
                disabled={comparisonResults.length === 0}
              />
              <SyncButton
                selectedCount={selectedItems.size}
                isSyncing={isLoading}
                isDisabled={isSyncDisabled}
                onClick={handleSync}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-400/10 px-4 py-3">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">
                  Error comparing products
                </h3>
                <p className="text-sm text-red-400 mt-2">{error}</p>
              </div>
            </div>
          </div>
        )}

        {hasCompared && (
          <>
            {comparisonResults.length > 0 ? (
              <ComparisonTable
                results={comparisonResults}
                selectedItems={selectedItems}
                onSelectAll={handleSelectAll}
                onSelectItem={handleSelectItem}
              />
            ) : (
              <div className="text-center text-gray-400 py-8">
                No missing products found in{' '}
                {compareDirection === 'production_to_staging'
                  ? 'staging'
                  : 'production'}
                .
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
