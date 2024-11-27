import { useState } from 'react';
import { useProductSyncStore } from '../stores/useProductSyncStore';
import {
  ComparisonTable,
  DirectionSelector,
  SyncButton,
} from '../components/ProductsSync';
import { formatDate } from '../utils/formatDate';
import ExportButton from '../components/ExportButton';
import { downloadCsv } from '../utils/downloadCsv';
import Notification from '../components/Notification';
import ProductDetailsPanel from '../components/ProductDetailsPanel';

export default function ProductsSync() {
  const {
    error,
    isLoading,
    setCompareDirection,
    hasCompared,
    compareDirection,
    comparisonResults,
    compareProducts,
    syncProducts,
  } = useProductSyncStore();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showExportNotification, setShowExportNotification] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

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

  const handleCompare = async () => {
    await compareProducts(compareDirection);
  };

  const handleSync = async () => {
    if (selectedItems.size === 0) return;
    try {
      await syncProducts(Array.from(selectedItems), compareDirection);
      setSelectedItems(new Set());
      setShowSyncNotification(true);
    } catch (error) {
      console.error('Error syncing products:', error);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Handle', 'Title', 'Status', 'Last Updated'],
      ...comparisonResults.map((result) => [
        result.handle,
        result.title,
        result.status,
        formatDate(result.updatedAt),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    downloadCsv({
      filename: 'products-comparison',
      data: csvContent,
      prefix: compareDirection,
    });

    setShowExportNotification(true);
  };

  const handleProductClick = (id: string) => {
    setSelectedProductId(id);
    setIsDetailsPanelOpen(true);
  };

  const isSyncDisabled = compareDirection === 'staging_to_production';

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
              isStagingToProductionEnabled={false}
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
                onClick={handleExport}
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
                onRowClick={handleProductClick}
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

      <ProductDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false);
          setSelectedProductId(null);
        }}
        productId={selectedProductId}
      />

      <Notification
        show={showExportNotification}
        title="Export successful"
        message="The products comparison data has been exported to CSV"
        onClose={() => setShowExportNotification(false)}
      />
      <Notification
        show={showSyncNotification}
        title="Sync successful"
        message="Selected products have been synced"
        onClose={() => setShowSyncNotification(false)}
      />
    </div>
  );
}
