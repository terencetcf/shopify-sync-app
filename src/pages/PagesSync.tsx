import { useEffect, useState, useMemo } from 'react';
import { Environment } from '../types/sync';
import Notification from '../components/Notification';
import PageDetailsPanel from '../components/PageDetails/PageDetailsPanel';
import { PageComparison, usePagesSyncStore } from '../stores/usePagesSyncStore';

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

export default function PagesSync() {
  const { pages, isLoading, error, fetchStoredPages, comparePages, syncPages } =
    usePagesSyncStore();

  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(
    new Set()
  );
  const [showCompareNotification, setShowCompareNotification] = useState(false);
  const [showSyncNotification, setShowSyncNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPage, setSelectedPage] = useState<PageComparison | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  useEffect(() => {
    fetchStoredPages();
  }, []);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setShowErrorNotification(true);
    }
  }, [error]);

  // Compute validation states for sync buttons
  const { canSyncToProduction, canSyncToStaging } = useMemo(() => {
    const selectedPages = pages.filter((p) => selectedHandles.has(p.handle));

    const hasMissingInStaging = selectedPages.some((p) => !p.staging_id);
    const hasMissingInProduction = selectedPages.some((p) => !p.production_id);

    return {
      canSyncToProduction: !hasMissingInStaging,
      canSyncToStaging: !hasMissingInProduction,
    };
  }, [pages, selectedHandles]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedHandles(new Set(pages.map((p) => p.handle)));
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
      await comparePages();
      setShowCompareNotification(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compare pages');
      setShowErrorNotification(true);
    }
  };

  const handleSync = async (targetEnvironment: Environment) => {
    try {
      await syncPages(Array.from(selectedHandles), targetEnvironment);
      setSelectedHandles(new Set());
      setShowSyncNotification(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || `Failed to sync pages to ${targetEnvironment}`
      );
      setShowErrorNotification(true);
    }
  };

  const handleRowClick = (page: PageComparison) => {
    setSelectedPage(page);
    setIsDetailsPanelOpen(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-200">Pages Sync</h1>
            <button
              onClick={handleCompare}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-gray-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && selectedHandles.size === 0
                ? 'Updating pages comparison...'
                : 'Refresh pages comparison'}
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
                  ? 'Cannot sync to staging: Some selected pages are missing in production'
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
                  ? 'Cannot sync to production: Some selected pages are missing in staging'
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
          Compare pages between production and staging environments.
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
                          checked={selectedHandles.size === pages.length}
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
                    {pages.map((page) => (
                      <tr
                        key={page.handle}
                        onClick={() => handleRowClick(page)}
                        className="cursor-pointer hover:bg-gray-750"
                      >
                        <td
                          className="px-3 py-4 text-sm text-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                            checked={selectedHandles.has(page.handle)}
                            onChange={() => handleSelectRow(page.handle)}
                          />
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300">
                          <div
                            className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                            title={page.title}
                          >
                            {page.title}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {page.handle}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-300">
                          <div className="flex flex-wrap gap-1">
                            {page.differences
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
                          {new Date(page.updated_at).toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {new Date(page.updated_at).toLocaleString()}
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
        message="Pages have been compared successfully"
        onClose={() => setShowCompareNotification(false)}
      />

      <Notification
        show={showSyncNotification}
        title="Sync Complete"
        message="Selected pages have been synced successfully"
        onClose={() => setShowSyncNotification(false)}
      />

      <Notification
        show={showErrorNotification}
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorNotification(false)}
        type="error"
      />

      <PageDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false);
          setSelectedPage(null);
        }}
        page={selectedPage}
      />
    </div>
  );
}
