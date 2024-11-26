import { useEffect, useState } from 'react';
import { useCollectionsSyncStore } from '../stores/useCollectionsSyncStore';
import {
  ComparisonTable,
  DirectionSelector,
  SyncButton,
  ExportButton,
} from '../components/CollectionsSync';

export default function CollectionsSync() {
  const {
    comparisonResults,
    isLoadingProduction,
    isLoadingStaging,
    error,
    compareCollections,
    compareDirection,
    setCompareDirection,
    hasCompared,
    resetComparison,
    syncCollections,
    isStagingToProductionEnabled,
  } = useCollectionsSyncStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    resetComparison();
    setSelectedItems(new Set());
  }, [resetComparison]);

  const handleSelectAll = () => {
    if (selectedItems.size === comparisonResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(comparisonResults.map((result) => result.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const isSyncDisabled =
    !isStagingToProductionEnabled &&
    compareDirection === 'staging_to_production';

  const handleSync = async () => {
    if (selectedItems.size === 0 || isSyncDisabled) return;

    if (isSyncDisabled) {
      alert(
        'Syncing from staging to production is temporarily disabled for safety reasons. Please contact your administrator for more information.'
      );
      return;
    }

    setIsSyncing(true);
    try {
      const ids = Array.from(selectedItems);

      // Sync collections one by one
      await syncCollections(ids, compareDirection);

      // Reset selection after successful sync
      setSelectedItems(new Set());

      // Show success message (you might want to add a toast notification here)
      console.log('Successfully synced collections');
    } catch (error) {
      console.error('Error syncing collections:', error);
      // Show error message (you might want to add a toast notification here)
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDirectionChange = (
    newDirection: 'production_to_staging' | 'staging_to_production'
  ) => {
    setCompareDirection(newDirection);
    resetComparison();
    setSelectedItems(new Set());
  };

  const handleExport = () => {
    if (comparisonResults.length === 0) return;

    const csvContent = [
      // CSV Headers
      ['Title', 'Handle', 'Products Count', 'Last Updated'].join(','),
      // CSV Data
      ...comparisonResults.map((result) =>
        [
          result.title,
          result.handle,
          result.status === 'missing_in_staging'
            ? result.productionCount
            : result.stagingCount,
          result.updatedAt
            ? new Date(result.updatedAt).toLocaleDateString()
            : '-',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `collections-comparison-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

  return (
    <div className="px-5">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <div className="border-l-4 border-blue-500 pl-4">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Collections Sync
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl">
              Compare collections between production and staging environments.
              Select comparison direction and click Compare to start.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <DirectionSelector
              value={compareDirection}
              onChange={handleDirectionChange}
              isStagingToProductionEnabled={isStagingToProductionEnabled}
            />

            <button
              type="button"
              onClick={() => compareCollections(compareDirection)}
              disabled={isLoadingProduction || isLoadingStaging}
              className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingProduction || isLoadingStaging ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Comparing...
                </>
              ) : (
                'Compare'
              )}
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
                isSyncing={isSyncing}
                isDisabled={isSyncDisabled}
                onClick={handleSync}
              />
            </div>
          )}
        </div>

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
                No missing collections found in{' '}
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
