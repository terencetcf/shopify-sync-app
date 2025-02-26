import { useEffect, useState, useMemo, Fragment } from 'react';
import { Environment } from '../types/environment';
import { useFilesSyncStore } from '../stores/useFilesSyncStore';
import { SyncProgress } from '../components/SyncProgress';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../stores/useNotificationStore';
import { ScrollToTop } from '../components/ScrollToTop';
import { SearchInput } from '../components/SearchInput';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { extractFileName } from '../utils/fileUtils';
import { ResizableHeader } from '../components/ResizableHeader';
import { uiSettingDb } from '../services/uiSettingDb';
import FileDetailsPanel from '../components/FileDetails/FileDetailsPanel';
import { FileComparison } from '../types/file';
import { DifferenceBadge } from '../components/DifferenceBadge';
import { STATUS_FILTER_OPTIONS } from '../types/status';

export default function FilesSync() {
  const {
    files,
    isLoading,
    error,
    fetchStoredFiles,
    compareFiles,
    syncFiles,
    syncProgress,
    compareProgress,
  } = useFilesSyncStore();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set()
  );

  const { showNotification } = useNotificationStore();

  const [columnWidths, setColumnWidths] = useState({
    checkbox: 30,
    fileName: 550,
    altText: 150,
    differences: 120,
    lastUpdated: 150,
    lastCompared: 150,
  });

  const [selectedFile, setSelectedFile] = useState<FileComparison | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  useEffect(() => {
    const loadColumnWidths = async () => {
      const savedWidths = await uiSettingDb.getUiSetting<typeof columnWidths>(
        'fileColumnWidths'
      );
      if (savedWidths) {
        setColumnWidths(savedWidths);
      }
    };
    loadColumnWidths();
  }, []);

  const handleColumnResize = async (
    column: keyof typeof columnWidths,
    width: number
  ) => {
    const newWidths = {
      ...columnWidths,
      [column]: width,
    };
    setColumnWidths(newWidths);
    await uiSettingDb.setUiSetting('fileColumnWidths', newWidths);
  };

  const filteredFiles = useMemo(() => {
    let filtered = files;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.alt.toLowerCase().includes(query) ||
          extractFileName(file.url).toLowerCase().includes(query)
      );
    }

    if (selectedFilters.size > 0) {
      filtered = filtered.filter((file) => {
        return Array.from(selectedFilters).some((filter) => {
          switch (filter) {
            case 'missing_staging':
              return !file.staging_id;
            case 'missing_production':
              return !file.production_id;
            case 'has_differences':
              return file.differences !== 'In sync';
            case 'in_sync':
              return file.differences === 'In sync';
            default:
              return false;
          }
        });
      });
    }

    return filtered;
  }, [files, searchQuery, selectedFilters]);

  useEffect(() => {
    fetchStoredFiles();
  }, []);

  // Compute validation states for sync buttons
  const { canSyncToProduction, canSyncToStaging } = useMemo(() => {
    const selectedFiles = files.filter((c) => selectedIds.has(c.id));

    const hasMissingInStaging = selectedFiles.some((c) => !c.staging_id);

    const hasMissingInProduction = selectedFiles.some((c) => !c.production_id);

    return {
      canSyncToProduction: !hasMissingInStaging,
      canSyncToStaging: !hasMissingInProduction,
    };
  }, [files, selectedIds]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  };

  const handleSelectFile = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (selectedIds.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleCompare = async () => {
    try {
      await compareFiles();
      showNotification({
        title: 'Comparison Complete',
        message: 'Files have been compared successfully',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Failed to compare files',
        type: 'error',
      });
    }
  };

  const handleSync = async (targetEnvironment: Environment) => {
    try {
      await syncFiles(Array.from(selectedIds), targetEnvironment);
      setSelectedIds(new Set());
      showNotification({
        title: 'Sync Complete',
        message: 'Selected files have been synced successfully',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || `Failed to sync files to ${targetEnvironment}`,
        type: 'error',
      });
    }
  };

  const inSyncCount = useMemo(() => {
    return filteredFiles.filter((f) => f.differences === 'In sync').length;
  }, [filteredFiles]);

  const missingOnStagingsCount = useMemo(() => {
    return filteredFiles.filter((f) => !f.staging_id).length;
  }, [filteredFiles]);

  const missingOnProductionsCount = useMemo(() => {
    return filteredFiles.filter((f) => !f.production_id).length;
  }, [filteredFiles]);

  const differenceCount = useMemo(() => {
    return filteredFiles.filter(
      (f) => f.staging_id && f.production_id && f.differences !== 'In sync'
    ).length;
  }, [filteredFiles]);

  const isProcessing =
    isLoading || syncProgress !== null || compareProgress !== null;

  const handleRowClick = (file: FileComparison) => {
    setSelectedFile(file);
    setIsDetailsPanelOpen(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {isProcessing && <div className="fixed inset-0 bg-black/20 z-40" />}

      <div className={isProcessing ? 'pointer-events-none' : ''}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-200">Files</h1>
              <button
                onClick={handleCompare}
                disabled={isLoading}
                className={`p-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-400 transition-colors duration-200 ${
                  isLoading ? 'cursor-not-allowed opacity-50' : ''
                }`}
                title="Get latest data from servers."
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </button>
              <span className="text-sm text-gray-400">
                Click refresh button to get the latest differences from servers
              </span>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => handleSync('staging')}
                disabled={
                  isLoading || selectedIds.size === 0 || !canSyncToStaging
                }
                title={
                  !canSyncToStaging
                    ? 'Cannot sync to staging: Some selected files are missing in production'
                    : ''
                }
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedIds.size > 0 && isLoading
                  ? 'Syncing...'
                  : `Sync to Staging (${selectedIds.size})`}
              </button>
              <button
                onClick={() => handleSync('production')}
                disabled={
                  isLoading || selectedIds.size === 0 || !canSyncToProduction
                }
                title={
                  !canSyncToProduction
                    ? 'Cannot sync to production: Some selected files are missing in staging'
                    : ''
                }
                className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedIds.size > 0 && isLoading
                  ? 'Syncing...'
                  : `Sync to Production (${selectedIds.size})`}
              </button>
            </div>
          </div>

          <div className="flex gap-4 items-center justify-stretch mt-2">
            <div className="flex-shrink w-60">
              <Popover className="relative">
                <PopoverButton className="relative w-full cursor-default rounded-md bg-gray-700 py-1.5 pl-3 pr-10 text-left text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6">
                  <span className="block truncate">
                    {selectedFilters.size === 0
                      ? 'Filter by status'
                      : `${selectedFilters.size} filter${
                          selectedFilters.size > 1 ? 's' : ''
                        } selected`}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </PopoverButton>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <PopoverPanel className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-gray-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-2 space-y-2">
                      {STATUS_FILTER_OPTIONS.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={option.id}
                            checked={selectedFilters.has(option.id)}
                            onChange={(e) => {
                              const newFilters = new Set(selectedFilters);
                              if (e.target.checked) {
                                newFilters.add(option.id);
                              } else {
                                newFilters.delete(option.id);
                              }
                              setSelectedFilters(newFilters);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                          />
                          <label
                            htmlFor={option.id}
                            className="ml-2 text-sm text-gray-300 select-none"
                          >
                            {option.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverPanel>
                </Transition>
              </Popover>
            </div>
            <div className="flex w-2/5">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search files..."
              />
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
                  Oops! Something isn't working as expected
                </h3>
                <div className="mt-2">
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className={`relative ${isLoading ? 'opacity-50' : ''}`}>
                {isLoading && (
                  <div className="fixed inset-x-0 top-1/2 transform -translate-y-1/2 flex flex-col items-center justify-center space-y-4 z-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="text-white bg-gradient-to-br from-transparent via-gray-900/75 to-transparent px-5 py-3 rounded-lg">
                      {selectedIds.size > 0
                        ? `Syncing selected files to environment...`
                        : 'Retrieving latest data from servers...'}
                    </p>
                  </div>
                )}
                <div className="text-right text-sm text-gray-400 mb-2">
                  <svg
                    className="h-4 w-4 text-gray-400 mr-2 inline"
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
                  Total {filteredFiles.length} files, {inSyncCount} in sync,{' '}
                  {missingOnStagingsCount} missing on Staging,{' '}
                  {missingOnProductionsCount} missing on Production,{' '}
                  {differenceCount} has differences
                </div>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  {filteredFiles.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          <ResizableHeader
                            width={columnWidths.checkbox}
                            minWidth={columnWidths.checkbox}
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                            resizable={false}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                              checked={
                                selectedIds.size === filteredFiles.length &&
                                filteredFiles.length > 0
                              }
                              onChange={handleSelectAll}
                            />
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.fileName}
                            minWidth={100}
                            onResize={(width) =>
                              handleColumnResize('fileName', width)
                            }
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                          >
                            File Name
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.altText}
                            minWidth={100}
                            onResize={(width) =>
                              handleColumnResize('altText', width)
                            }
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                          >
                            Alt Text
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.differences}
                            minWidth={100}
                            onResize={(width) =>
                              handleColumnResize('differences', width)
                            }
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                          >
                            Differences
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.lastUpdated}
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                            resizable={false}
                          >
                            Last Updated
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.lastCompared}
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                            resizable={false}
                          >
                            Last Compared
                          </ResizableHeader>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700 bg-gray-800">
                        {filteredFiles.map((file) => (
                          <tr
                            key={file.id}
                            className="hover:bg-gray-750 cursor-pointer"
                            onClick={() => handleRowClick(file)}
                          >
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: columnWidths.checkbox,
                                maxWidth: columnWidths.checkbox,
                              }}
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                checked={selectedIds.has(file.id)}
                                onChange={() => handleSelectFile(file.id)}
                              />
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.fileName,
                                maxWidth: columnWidths.fileName,
                              }}
                            >
                              <div
                                className="truncate"
                                title={extractFileName(file.url)}
                              >
                                {extractFileName(file.url)}
                              </div>
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.altText,
                                maxWidth: columnWidths.altText,
                              }}
                            >
                              <div className="truncate" title={file.alt}>
                                {file.alt}
                              </div>
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.differences,
                                maxWidth: columnWidths.differences,
                              }}
                            >
                              <div className="flex flex-wrap gap-1">
                                {file.differences
                                  .split(', ')
                                  .map((difference, index) => (
                                    <DifferenceBadge
                                      key={index}
                                      text={difference}
                                    />
                                  ))}
                              </div>
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.lastUpdated,
                                maxWidth: columnWidths.lastUpdated,
                              }}
                            >
                              <div
                                className="truncate"
                                title={new Date(
                                  file.updated_at
                                ).toLocaleString()}
                              >
                                {new Date(file.updated_at).toLocaleString()}
                              </div>
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.lastCompared,
                                maxWidth: columnWidths.lastCompared,
                              }}
                            >
                              <div
                                className="truncate"
                                title={new Date(
                                  file.compared_at
                                ).toLocaleString()}
                              >
                                {new Date(file.compared_at).toLocaleString()}
                              </div>
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

        <FileDetailsPanel
          isOpen={isDetailsPanelOpen}
          onClose={() => {
            setIsDetailsPanelOpen(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
        />
      </div>

      <ScrollToTop />

      {syncProgress && (
        <div className="fixed bottom-6 right-20 w-96 z-50">
          <div className="transform transition-all duration-500 ease-in-out">
            <SyncProgress
              current={syncProgress.current}
              total={syncProgress.total}
              type="files"
            />
          </div>
        </div>
      )}

      {compareProgress && (
        <div className="fixed bottom-6 right-20 w-96 z-50">
          <div className="transform transition-all duration-500 ease-in-out">
            <SyncProgress
              current={compareProgress.current}
              total={compareProgress.total}
              type="files"
              message="Retrieving latest data from servers..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
