import { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { Environment } from '../types/environment';
import ProductDetailsPanel from '../components/ProductDetails/ProductDetailsPanel';
import { useProductsSyncStore } from '../stores/useProductsSyncStore';
import { SyncProgress } from '../components/SyncProgress';
import { ProductComparison } from '../types/product';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNotificationStore } from '../stores/useNotificationStore';
import { ResizableHeader } from '../components/ResizableHeader';
import { uiSettingDb } from '../services/uiSettingDb';
import { ScrollToTop } from '../components/ScrollToTop';
import { SearchInput } from '../components/SearchInput';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import {
  ChevronUpDownIcon,
  XMarkIcon,
  ChevronDownIcon,
} from '@heroicons/react/20/solid';
import { collectionDb } from '../services/collectionDb';
import { DifferenceBadge } from '../components/DifferenceBadge';
import { STATUS_FILTER_OPTIONS } from '../types/status';

export default function ProductsSync() {
  const {
    products,
    isLoading,
    error,
    fetchStoredProducts,
    compareProducts,
    syncProducts,
    syncProgress,
    compareProgress,
  } = useProductsSyncStore();

  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(
    new Set()
  );
  const [selectedProduct, setSelectedProduct] =
    useState<ProductComparison | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  const { showNotification } = useNotificationStore();

  const [columnWidths, setColumnWidths] = useState({
    checkbox: 30,
    title: 350,
    handle: 150,
    differences: 120,
    lastUpdated: 150,
    lastCompared: 150,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');

  const [availableCollections, setAvailableCollections] = useState<
    Array<{ handle: string; title: string }>
  >([]);

  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');

  const collectionSearchInputRef = useRef<HTMLInputElement>(null);

  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const loadCollections = async () => {
      const collections = await collectionDb.getCollectionComparisons();
      setAvailableCollections(
        collections.map((c) => ({
          handle: c.handle,
          title: c.title,
        }))
      );
    };
    loadCollections();
  }, []);

  const collectionOptions = useMemo(() => {
    const sortedCollections = [...availableCollections].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    return [
      { value: 'all', label: 'All Collections' },
      ...sortedCollections.map((c) => ({
        value: c.handle,
        label: `${c.title} (${c.handle})`,
      })),
    ];
  }, [availableCollections]);

  const filteredCollectionOptions = useMemo(() => {
    const options = collectionOptions;
    if (!collectionSearchQuery) return options;

    const query = collectionSearchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [collectionOptions, collectionSearchQuery]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.title.toLowerCase().includes(query) ||
          product.handle.toLowerCase().includes(query)
      );
    }

    if (selectedCollection !== 'all') {
      filtered = filtered.filter((product) =>
        product.collections?.includes(selectedCollection)
      );
    }

    if (selectedFilters.size > 0) {
      filtered = filtered.filter((product) => {
        return Array.from(selectedFilters).some((filter) => {
          switch (filter) {
            case 'missing_staging':
              return !product.staging_id;
            case 'missing_production':
              return !product.production_id;
            case 'has_differences':
              return (
                product.staging_id &&
                product.production_id &&
                product.differences !== 'In sync'
              );
            case 'in_sync':
              return product.differences === 'In sync';
            default:
              return false;
          }
        });
      });
    }

    return filtered;
  }, [products, searchQuery, selectedCollection, selectedFilters]);

  useEffect(() => {
    const loadColumnWidths = async () => {
      const savedWidths = await uiSettingDb.getUiSetting<typeof columnWidths>(
        'productColumnWidths'
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
    await uiSettingDb.setUiSetting('productColumnWidths', newWidths);
  };

  useEffect(() => {
    fetchStoredProducts();
  }, []);

  // Compute validation states for sync buttons
  const { canSyncToProduction, canSyncToStaging } = useMemo(() => {
    const selectedProducts = products.filter((p) =>
      selectedHandles.has(p.handle)
    );

    const hasMissingInStaging = selectedProducts.some((p) => !p.staging_id);
    const hasMissingInProduction = selectedProducts.some(
      (p) => !p.production_id
    );

    return {
      canSyncToProduction: !hasMissingInStaging,
      canSyncToStaging: !hasMissingInProduction,
    };
  }, [products, selectedHandles]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedHandles(new Set(filteredProducts.map((p) => p.handle)));
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
      await compareProducts();
      showNotification({
        title: 'Comparison Complete',
        message: 'Products have been compared successfully',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message: err.message || 'Failed to compare products',
        type: 'error',
      });
    }
  };

  const handleSync = async (targetEnvironment: Environment) => {
    try {
      await syncProducts(Array.from(selectedHandles), targetEnvironment);
      setSelectedHandles(new Set());
      showNotification({
        title: 'Sync Complete',
        message: 'Selected products have been synced successfully',
      });
    } catch (err: any) {
      showNotification({
        title: 'Error',
        message:
          err.message || `Failed to sync products to ${targetEnvironment}`,
        type: 'error',
      });
    }
  };

  const handleRowClick = (product: ProductComparison) => {
    setSelectedProduct(product);
    setIsDetailsPanelOpen(true);
  };

  const inSyncCount = useMemo(() => {
    return filteredProducts.filter((p) => p.differences === 'In sync').length;
  }, [filteredProducts]);

  const missingOnStagingsCount = useMemo(() => {
    return filteredProducts.filter((p) => !p.staging_id).length;
  }, [filteredProducts]);

  const missingOnProductionsCount = useMemo(() => {
    return filteredProducts.filter((p) => !p.production_id).length;
  }, [filteredProducts]);

  const differenceCount = useMemo(() => {
    return filteredProducts.filter(
      (p) => p.staging_id && p.production_id && p.differences !== 'In sync'
    ).length;
  }, [filteredProducts]);

  const isProcessing =
    isLoading || syncProgress !== null || compareProgress !== null;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {isProcessing && <div className="fixed inset-0 bg-black/20 z-40" />}

      <div className={isProcessing ? 'pointer-events-none' : ''}>
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-200">Products</h1>
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
                <span className="sr-only">Get latest data from servers.</span>
              </button>
              <span className="text-sm text-gray-400">
                Click refresh button to get the latest differences from servers
              </span>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => handleSync('staging')}
                disabled={
                  isLoading || selectedHandles.size === 0 || !canSyncToStaging
                }
                title={
                  !canSyncToStaging
                    ? 'Cannot sync to staging: Some selected products are missing in production'
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
                  isLoading ||
                  selectedHandles.size === 0 ||
                  !canSyncToProduction
                }
                title={
                  !canSyncToProduction
                    ? 'Cannot sync to production: Some selected products are missing in staging'
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
            <div className="flex-auto w-1/5">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search products..."
              />
            </div>
            <div className="flex-auto w-4/12">
              <Listbox
                value={selectedCollection}
                onChange={setSelectedCollection}
              >
                <div className="relative flex-auto">
                  <ListboxButton className="relative w-full cursor-default rounded-md bg-gray-700 py-1.5 pl-3 pr-10 text-left text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6">
                    <span className="block truncate">
                      {
                        collectionOptions.find(
                          (opt) => opt.value === selectedCollection
                        )?.label
                      }
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </span>
                  </ListboxButton>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      <div className="sticky top-0 z-10 bg-gray-700 p-2">
                        <div className="relative">
                          <input
                            ref={collectionSearchInputRef}
                            type="text"
                            className="w-full rounded-md border-0 bg-gray-600 py-1.5 pl-3 pr-8 text-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                            placeholder="Search collections..."
                            value={collectionSearchQuery}
                            onChange={(e) =>
                              setCollectionSearchQuery(e.target.value)
                            }
                            onClick={(e) => e.stopPropagation()}
                          />
                          {collectionSearchQuery && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollectionSearchQuery('');
                                setSelectedCollection('all');
                                collectionSearchInputRef.current?.focus();
                              }}
                              className="absolute inset-y-0 right-1 flex items-center shadow-none"
                            >
                              <XMarkIcon
                                className="h-5 w-5 text-gray-400 hover:text-gray-200"
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </div>
                      </div>
                      {filteredCollectionOptions.map((option) => (
                        <ListboxOption
                          key={option.value}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-3 pr-9 ${
                              active
                                ? 'bg-gray-600 text-white'
                                : 'text-gray-300'
                            }`
                          }
                          value={option.value}
                        >
                          {({ selected }) => (
                            <span
                              className={`block truncate ${
                                selected ? 'font-semibold' : 'font-normal'
                              }`}
                            >
                              {option.label}
                            </span>
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Transition>
                </div>
              </Listbox>
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
                  Opps! Something isn't working as expected
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
                      {selectedHandles.size > 0
                        ? `Syncing selected products to environment...`
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
                  Total {filteredProducts.length} products, {inSyncCount} in
                  sync, {missingOnStagingsCount} missing on Staging,{' '}
                  {missingOnProductionsCount} missing on Production,{' '}
                  {differenceCount} has differences
                </div>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  {products.length > 0 ? (
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
                              checked={selectedHandles.size === products.length}
                              onChange={handleSelectAll}
                            />
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.title}
                            onResize={(width) =>
                              handleColumnResize('title', width)
                            }
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                          >
                            Title
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.handle}
                            onResize={(width) =>
                              handleColumnResize('handle', width)
                            }
                            className="px-3 py-4 text-left text-sm font-semibold text-gray-200"
                          >
                            Handle
                          </ResizableHeader>
                          <ResizableHeader
                            width={columnWidths.differences}
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
                        {filteredProducts.map((product) => (
                          <tr
                            key={product.handle}
                            onClick={() => handleRowClick(product)}
                            className="cursor-pointer hover:bg-gray-750"
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
                                checked={selectedHandles.has(product.handle)}
                                onChange={() => handleSelectRow(product.handle)}
                              />
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.title,
                                maxWidth: columnWidths.title,
                              }}
                            >
                              <div className="truncate" title={product.title}>
                                {product.title}
                              </div>
                              <div className="absolute right-0 inset-y-0 w-px bg-gray-600/30" />
                            </td>
                            <td
                              className="px-3 py-4 text-sm text-gray-300 overflow-hidden relative"
                              style={{
                                width: columnWidths.handle,
                                maxWidth: columnWidths.handle,
                              }}
                            >
                              <div className="truncate" title={product.handle}>
                                {product.handle}
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
                              <div className="flex flex-wrap gap-1 overflow-hidden">
                                {product.differences
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
                                  product.updated_at
                                ).toLocaleString()}
                              >
                                {new Date(product.updated_at).toLocaleString()}
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
                                  product.compared_at
                                ).toLocaleString()}
                              >
                                {new Date(product.compared_at).toLocaleString()}
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
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-200">
                        No products
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
                          Refresh products comparison
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ProductDetailsPanel
          isOpen={isDetailsPanelOpen}
          onClose={() => {
            setIsDetailsPanelOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      </div>

      <ScrollToTop />

      {syncProgress && (
        <div className="fixed bottom-6 right-20 w-96 z-50">
          <div className="transform transition-all duration-500 ease-in-out">
            <SyncProgress
              current={syncProgress.current}
              total={syncProgress.total}
              type="products"
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
              type="products"
              message="Retrieving latest data from servers..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
