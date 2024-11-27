import { useState } from 'react';
import { usePagesSyncStore } from '../stores/usePagesSyncStore';
import {
  ComparisonTable,
  DirectionSelector,
  SyncButton,
} from '../components/PagesSync';
import type { CompareDirection } from '../types/sync';
import ExportButton from '../components/ExportButton';

export default function PagesSync() {
  const [compareDirection, setCompareDirection] = useState<CompareDirection>(
    'production_to_staging'
  );
  const [hasCompared, setHasCompared] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const {
    comparisonResults,
    isLoading,
    error,
    comparePages,
    syncPages,
    exportComparison,
  } = usePagesSyncStore();

  const handleCompare = async () => {
    await comparePages(compareDirection);
    setHasCompared(true);
    setSelectedItems(new Set());
  };

  const handleSync = async () => {
    if (selectedItems.size === 0) return;
    setIsSyncing(true);
    try {
      await syncPages(Array.from(selectedItems), compareDirection);
      await handleCompare(); // Refresh comparison after sync
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    exportComparison(comparisonResults, compareDirection);
  };

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
    compareDirection === 'staging_to_production' &&
    !import.meta.env.VITE_ENABLE_STAGING_TO_PRODUCTION;

  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <div className="border-l-4 border-blue-500 pl-4">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Pages Sync
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl">
              Compare and sync pages between production and staging
              environments. Review differences and selectively sync content.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <DirectionSelector
              value={compareDirection}
              onChange={setCompareDirection}
              isStagingToProductionEnabled={!isSyncDisabled}
            />
            <button
              type="button"
              onClick={handleCompare}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
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
            <div className="flex items-center gap-4">
              <ExportButton
                onClick={handleExport}
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
                No missing pages found in{' '}
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
