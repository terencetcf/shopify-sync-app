import { useEffect, useMemo, useState } from 'react';
import { useProductSyncStore } from '../stores/useProductSyncStore';

type CompareDirection = 'production_to_staging' | 'staging_to_production';

interface ComparisonResult {
  handle: string;
  title: string;
  status: 'missing_in_production' | 'missing_in_staging';
  vendor: string;
  productType: string;
  totalInventory: number | null;
  updatedAt: string | null;
}

export default function ProductSync() {
  const {
    productionProducts,
    stagingProducts,
    isLoadingProduction,
    isLoadingStaging,
    error,
    fetchProducts,
    compareDirection,
    setCompareDirection,
    hasCompared,
    resetComparison,
    syncProducts,
    isStagingToProductionEnabled,
  } = useProductSyncStore();

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
      productionProducts.forEach((prodProduct) => {
        const stagingProduct = stagingProducts.find(
          (s) => s.handle === prodProduct.handle
        );

        if (!stagingProduct) {
          results.push({
            handle: prodProduct.handle,
            title: prodProduct.title,
            status: 'missing_in_staging',
            vendor: prodProduct.vendor,
            productType: prodProduct.productType,
            totalInventory: prodProduct.totalInventory,
            updatedAt: prodProduct.updatedAt,
          });
        }
      });
    } else {
      stagingProducts.forEach((stagingProduct) => {
        const prodProduct = productionProducts.find(
          (p) => p.handle === stagingProduct.handle
        );

        if (!prodProduct) {
          results.push({
            handle: stagingProduct.handle,
            title: stagingProduct.title,
            status: 'missing_in_production',
            vendor: stagingProduct.vendor,
            productType: stagingProduct.productType,
            totalInventory: stagingProduct.totalInventory,
            updatedAt: stagingProduct.updatedAt,
          });
        }
      });
    }

    return results;
  }, [productionProducts, stagingProducts, compareDirection, hasCompared]);

  const handleCompare = async () => {
    await fetchProducts();
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedItems(new Set(comparisonResults.map((item) => item.handle)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (handle: string) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(handle)) {
      newSelectedItems.delete(handle);
    } else {
      newSelectedItems.add(handle);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSync = async () => {
    if (selectedItems.size === 0) return;

    setIsSyncing(true);
    try {
      await syncProducts(Array.from(selectedItems), compareDirection);
      setSelectedItems(new Set());
    } catch (err: any) {
      console.error('Error syncing products:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <div className="border-l-4 border-blue-500 pl-4">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Products Sync
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl">
              Compare products between production and staging environments.
              Select comparison direction and click Compare to start.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <select
            value={compareDirection}
            onChange={(e) =>
              setCompareDirection(e.target.value as CompareDirection)
            }
            className="rounded-md border-0 bg-white/5 px-3 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10"
          >
            <option value="production_to_staging">Production → Staging</option>
            {isStagingToProductionEnabled && (
              <option value="staging_to_production">
                Staging → Production
              </option>
            )}
          </select>

          <button
            onClick={handleCompare}
            disabled={isLoadingProduction || isLoadingStaging}
            className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/10 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-400">Error</h3>
                <div className="mt-2 text-sm text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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
                            Title
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Handle
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Vendor
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Type
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Last Updated
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 bg-gray-900">
                        {comparisonResults.map((result) => (
                          <tr key={result.handle}>
                            <td className="relative px-7 sm:w-12 sm:px-6">
                              <input
                                type="checkbox"
                                className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                checked={selectedItems.has(result.handle)}
                                onChange={() => handleSelectItem(result.handle)}
                              />
                            </td>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-200 sm:pl-6">
                              {result.title}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200">
                              {result.handle}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200">
                              {result.vendor}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200">
                              {result.productType}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-200">
                              {new Date(result.updatedAt!).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No differences found</p>
              </div>
            )}

            {comparisonResults.length > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSync}
                  disabled={selectedItems.size === 0 || isSyncing}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Selected'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
