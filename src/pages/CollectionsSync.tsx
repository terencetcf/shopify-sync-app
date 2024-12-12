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

  // Add this computed value
  const differenceCount = useMemo(() => {
    return collections.filter((p) => p.differences !== 'In sync').length;
  }, [collections]);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-200">
              Collections
            </h1>
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-gray-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && selectedHandles.size === 0
                ? 'Updating collections comparison...'
                : 'Refresh collections comparison'}
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
        <div className="flex items-center justify-between">
          <div className="flex text-sm text-gray-400 mt-4">
            Compare collections between production and staging environments.
          </div>
          <div className="flex text-sm text-gray-400 mt-4">
            <svg
              className="h-4 w-4 text-gray-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Total {collections.length} collections, {differenceCount}{' '}
            differences
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-500/10 px-6 py-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="mt-3 text-xl font-semibold leading-6 text-red-400">
                Opps! Something isn’t working as expected
              </h3>
              <div className="mt-2">
                <p className="text-red-300">{error}</p>
              </div>
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
                  <p className="text-sm font-medium text-gray-200 px-4 py-2 rounded-md shadow-lg">
                    {selectedHandles.size > 0 ? 'Syncing...' : 'Updating...'}
                  </p>
                </div>
              )}
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                {collections.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-3 py-4 text-left text-sm font-semibold text-gray-200">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            checked={
                              selectedHandles.size === collections.length
                            }
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
                              onChange={() =>
                                handleSelectRow(collection.handle)
                              }
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
                ) : (
                  <div className="text-center py-12 bg-gray-800">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-200">
                      No collections
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Click the refresh button to get the latest data from the
                      server.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={handleCompare}
                        disabled={isLoading}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <svg
                          className="-ml-0.5 mr-1.5 h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Refresh collections comparison
                      </button>
                    </div>
                  </div>
                )}
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
