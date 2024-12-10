import { useEffect, useState, useMemo } from 'react';
import { Environment } from '../types/sync';
import Notification from '../components/Notification';
import CollectionDetailsPanel from '../components/CollectionDetails/CollectionDetailsPanel';
import type { CollectionComparison } from '../stores/useCollectionsSyncStore';
import { useCollectionsSyncStore } from '../stores/useCollectionsSyncStore';

function DifferenceBadge({ text }: { text: string }) {
  const getBadgeColor = (text: string) => {
    switch (text.toLowerCase()) {
      case 'in sync':
        return 'bg-green-400/10 text-green-400 ring-green-400/20';
      case 'missing in production':
        return 'bg-red-400/10 text-red-400 ring-red-400/20';
      case 'missing in staging':
        return 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20';
      default:
        return 'bg-blue-400/10 text-blue-400 ring-blue-400/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeColor(
        text
      )} mr-1 mb-1`}
    >
      {text}
    </span>
  );
}

export default function CollectionsSync() {
  const {
    collections,
    isLoading,
    error,
    fetchStoredCollections,
    compareCollections,
    syncCollections,
  } = useCollectionsSyncStore();

  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(
    new Set()
  );
  const [showCompareNotification, setShowCompareNotification] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCollection, setSelectedCollection] =
    useState<CollectionComparison | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  useEffect(() => {
    fetchStoredCollections();
  }, []);

  // Show error notification when error state changes
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setShowErrorNotification(true);
    }
  }, [error]);

  // Compute validation states for sync buttons
  const { canSyncToProduction, canSyncToStaging } = useMemo(() => {
    const selectedCollections = collections.filter((c) =>
      selectedHandles.has(c.handle)
    );

    const hasMissingInStaging = selectedCollections.some((c) => !c.staging_id);

    const hasMissingInProduction = selectedCollections.some(
      (c) => !c.production_id
    );

    return {
      canSyncToProduction: !hasMissingInStaging,
      canSyncToStaging: !hasMissingInProduction,
    };
  }, [collections, selectedHandles]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedHandles(new Set(collections.map((c) => c.handle)));
    } else {
      setSelectedHandles(new Set());
    }
  };

  const handleSelectRow = (handle: string) => {
    const newSelected = new Set(selectedHandles);
    if (selectedHandles.has(handle)) {
      newSelected.delete(handle);
    } else {
      newSelected.add(handle);
    }
    setSelectedHandles(newSelected);
  };

  const handleCompare = async () => {
    try {
      await compareCollections();
      setShowCompareNotification(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compare collections');
      setShowErrorNotification(true);
    }
  };

  const handleSync = async (targetEnvironment: Environment) => {
    try {
      await syncCollections(Array.from(selectedHandles), targetEnvironment);
      setSelectedHandles(new Set());
      setShowSyncNotification(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || `Failed to sync collections to ${targetEnvironment}`
      );
      setShowErrorNotification(true);
    }
  };

  const handleRowClick = (collection: CollectionComparison) => {
    setSelectedCollection(collection);
    setIsDetailsPanelOpen(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-200">
              Collections Sync
            </h1>
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-gray-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && selectedHandles.size === 0
                ? 'Updating collections...'
                : 'Refresh Collections'}
            </button>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => handleSync('staging')}
              disabled={
                isLoading || selectedHandles.size === 0 || !canSyncToStaging
              }
              title={
                !canSyncToStaging
                  ? 'Cannot sync to staging: Some selected collections are missing in production'
                  : ''
              }
              className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedHandles.size > 0 && isLoading
                ? 'Syncing...'
                : `Sync to Staging (${selectedHandles.size})`}
            </button>
            <button
              onClick={() => handleSync('production')}
              disabled={
                isLoading || selectedHandles.size === 0 || !canSyncToProduction
              }
              title={
                !canSyncToProduction
                  ? 'Cannot sync to production: Some selected collections are missing in staging'
                  : ''
              }
              className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedHandles.size > 0 && isLoading
                ? 'Syncing...'
                : `Sync to Production (${selectedHandles.size})`}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-400 mt-2">
          Compare collections between production and staging environments.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-400/10 px-4 py-3">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-400">Error</h3>
              <p className="text-sm text-red-400 mt-2">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className={`relative ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading && (
                <div className="fixed inset-x-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center justify-center space-y-4 z-50">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="text-sm font-medium text-gray-200 bg-gray-800 px-4 py-2 rounded-md shadow-lg">
                    {selectedHandles.size > 0 ? 'Syncing...' : 'Comparing...'}
                  </p>
                </div>
              )}
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          checked={selectedHandles.size === collections.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        Title
                      </th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        Handle
                      </th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        Differences
                      </th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        Last Updated
                      </th>
                      <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                        Last Compared
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {collections.map((collection) => (
                      <tr
                        key={collection.handle}
                        onClick={() => handleRowClick(collection)}
                        className="cursor-pointer hover:bg-gray-750"
                      >
                        <td
                          className="px-3 py-4 text-sm text-gray-300"
                          onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            checked={selectedHandles.has(collection.handle)}
                            onChange={() => handleSelectRow(collection.handle)}
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300">
                          <div
                            className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={collection.title}
                          >
                            {collection.title}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {collection.handle}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300">
                          <div className="flex flex-wrap gap-1">
                            {collection.differences
                              .split(', ')
                              .map((difference, index) => (
                                <DifferenceBadge
                                  key={index}
                                  text={difference}
                                />
                              ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {new Date(collection.updated_at).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {new Date(collection.compared_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Notification
        show={showCompareNotification}
        title="Comparison Complete"
        message="Collections have been compared successfully"
        onClose={() => setShowCompareNotification(false)}
      />

      <Notification
        show={showSyncNotification}
        title="Sync Complete"
        message="Selected collections have been synced successfully"
        onClose={() => setShowSyncNotification(false)}
      />

      <Notification
        show={showErrorNotification}
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorNotification(false)}
        type="error"
      />

      <CollectionDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false);
          setSelectedCollection(null);
        }}
        collection={selectedCollection}
      />
    </div>
  );
}
