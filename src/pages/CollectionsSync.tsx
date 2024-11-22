import { useEffect, useMemo, useState } from 'react';
import { useSyncStore } from '../stores/useCollectionsSyncStore';

interface ComparisonResult {
  handle: string;
  title: string;
  productionCount: number | null;
  stagingCount: number | null;
  status: 'missing_in_production' | 'missing_in_staging';
  updatedAt: string | null;
}

export default function Sync() {
  const {
    productionCollections,
    stagingCollections,
    isLoadingProduction,
    isLoadingStaging,
    error,
    fetchCollections,
    compareDirection,
    setCompareDirection,
    hasCompared,
    resetComparison,
    syncCollections,
    isStagingToProductionEnabled,
  } = useSyncStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    resetComparison();
    setSelectedItems(new Set());
  }, [resetComparison]);

  const comparisonResults = useMemo(() => {
    if (!hasCompared) return [];

    const results: ComparisonResult[] = [];

    if (compareDirection === 'production_to_staging') {
      productionCollections.forEach((prodCollection) => {
        const stagingCollection = stagingCollections.find(
          (s) => s.handle === prodCollection.handle
        );

        if (!stagingCollection) {
          results.push({
            handle: prodCollection.handle,
            title: prodCollection.title,
            productionCount: prodCollection.productsCount,
            stagingCount: null,
            status: 'missing_in_staging',
            updatedAt: prodCollection.updatedAt,
          });
        }
      });
    } else {
      stagingCollections.forEach((stagingCollection) => {
        const prodCollection = productionCollections.find(
          (p) => p.handle === stagingCollection.handle
        );

        if (!prodCollection) {
          results.push({
            handle: stagingCollection.handle,
            title: stagingCollection.title,
            productionCount: null,
            stagingCount: stagingCollection.productsCount,
            status: 'missing_in_production',
            updatedAt: stagingCollection.updatedAt,
          });
        }
      });
    }

    return results;
  }, [
    productionCollections,
    stagingCollections,
    compareDirection,
    hasCompared,
  ]);

  const handleSelectAll = () => {
    if (selectedItems.size === comparisonResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(
        new Set(comparisonResults.map((result) => result.handle))
      );
    }
  };

  const handleSelectItem = (handle: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(handle)) {
      newSelected.delete(handle);
    } else {
      newSelected.add(handle);
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
      const handles = Array.from(selectedItems);

      // Sync collections one by one
      for (const handle of handles) {
        await syncCollections([handle], compareDirection);
      }

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

  const exportToCSV = () => {
    const headers = ['Collection', 'Handle', 'Products Count', 'Last Updated'];
    const csvData = comparisonResults.map((result) => [
      result.title,
      result.handle,
      compareDirection === 'production_to_staging'
        ? result.productionCount ?? ''
        : result.stagingCount ?? '',
      result.updatedAt ? new Date(result.updatedAt).toLocaleDateString() : '',
    ]);

    csvData.unshift(headers);
    const csvString = csvData.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `sync_report_${compareDirection}_${new Date().toISOString()}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDirectionChange = (
    newDirection: 'production_to_staging' | 'staging_to_production'
  ) => {
    setCompareDirection(newDirection);
    resetComparison();
    setSelectedItems(new Set());
  };

  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
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
            <div className="relative">
              <select
                value={compareDirection}
                onChange={(e) =>
                  handleDirectionChange(
                    e.target.value as
                      | 'production_to_staging'
                      | 'staging_to_production'
                  )
                }
                className="block rounded-md border-0 bg-gray-700 text-white py-1.5 pl-3 pr-10 text-gray-300 ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
              >
                <option value="production_to_staging">
                  Production → Staging
                </option>
                <option value="staging_to_production">
                  Staging → Production
                </option>
              </select>
              {!isStagingToProductionEnabled &&
                compareDirection === 'staging_to_production' && (
                  <div className="absolute left-0 -bottom-6 text-xs text-yellow-400">
                    Note: Sync to Production is disabled
                  </div>
                )}
            </div>

            <button
              onClick={fetchCollections}
              disabled={isLoadingProduction || isLoadingStaging}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingProduction || isLoadingStaging ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              <button
                type="button"
                onClick={handleSync}
                disabled={
                  selectedItems.size === 0 || isSyncing || isSyncDisabled
                }
                className="inline-flex items-center rounded-md bg-green-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  isSyncDisabled
                    ? 'Syncing from staging to production is temporarily disabled'
                    : ''
                }
              >
                {isSyncing ? (
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
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg
                      className="-ml-0.5 mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m-6 3.75l3 3m0 0l3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75"
                      />
                    </svg>
                    Sync Selected ({selectedItems.size})
                    {isSyncDisabled && ' (Disabled)'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <svg
                  className="-ml-0.5 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Export Report
              </button>
            </div>
          )}
        </div>

        {hasCompared && (
          <>
            {comparisonResults.length > 0 ? (
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          <th
                            scope="col"
                            className="relative px-7 sm:w-12 sm:px-6"
                          >
                            <input
                              type="checkbox"
                              className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                              checked={
                                selectedItems.size === comparisonResults.length
                              }
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6">
                            Collection
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Products Count
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Last Updated
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-800">
                        {comparisonResults.map((result) => (
                          <tr key={result.handle} className="hover:bg-gray-700">
                            <td className="relative px-7 sm:w-12 sm:px-6">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                checked={selectedItems.has(result.handle)}
                                onChange={() => handleSelectItem(result.handle)}
                              />
                            </td>
                            <td className="py-4 pl-4 pr-3 text-sm text-gray-100 sm:pl-6">
                              {result.title}
                              <span className="block text-xs text-gray-400">
                                {result.handle}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-300">
                              {compareDirection === 'production_to_staging'
                                ? result.productionCount
                                : result.stagingCount}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-300">
                              {result.updatedAt
                                ? new Date(
                                    result.updatedAt
                                  ).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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
