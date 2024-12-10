import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect } from 'react';
import {
  PageComparison,
  usePagesSyncStore,
} from '../../stores/usePagesSyncStore';
import { formatDate } from '../../utils/formatDate';

interface PageDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  page: PageComparison | null;
}

export default function PageDetailsPanel({
  isOpen,
  onClose,
  page,
}: PageDetailsPanelProps) {
  const { selectedPage, isLoadingDetails, fetchPageDetails } =
    usePagesSyncStore();

  useEffect(() => {
    if (isOpen && page) {
      if (page.production_id) {
        fetchPageDetails(page.production_id, 'production');
      } else {
        fetchPageDetails(page.staging_id!, 'staging');
      }
    }
  }, [isOpen, page, fetchPageDetails]);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0">
          <TransitionChild
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-300"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <DialogPanel className="fixed right-0 inset-y-0 w-[50%] min-w-[500px] bg-gray-800">
              <div className="h-full flex flex-col overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {/* Header */}
                <div className="px-4 sm:px-6 py-6 bg-gray-900">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-base font-semibold leading-6 text-gray-100">
                      Page Details
                    </DialogTitle>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        className="rounded-md bg-gray-900 text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="relative flex-1 px-4 sm:px-6">
                  {isLoadingDetails ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      <p className="text-sm text-gray-400">
                        Loading page details...
                      </p>
                    </div>
                  ) : selectedPage ? (
                    <div className="space-y-6 pt-6 pb-5">
                      {/* Title Section */}
                      <div className="space-y-6 border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          {selectedPage.title}
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                          {selectedPage.body && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">
                                Content
                              </h4>
                              <div
                                className="mt-1 text-sm text-gray-200 prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: selectedPage.body,
                                }}
                              />
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Status
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedPage.isPublished ? 'Published' : 'Draft'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Metafields Section */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-200 mb-4">
                          Metafields
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedPage.metafields.edges.map(({ node }) => (
                            <div
                              key={`${node.namespace}.${node.key}`}
                              className="bg-gray-900 p-4 rounded-md"
                            >
                              <h4 className="text-sm font-medium text-gray-400">
                                {node.namespace}.{node.key}
                              </h4>
                              <p className="mt-1 text-sm text-gray-200">
                                {node.value}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                Type: {node.type}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-200 mb-4">
                          Additional Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Handle
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedPage.handle}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Template Suffix
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedPage.templateSuffix || 'None'}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Last Updated
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {formatDate(selectedPage.updatedAt)}
                            </p>
                          </div>

                          {selectedPage.publishedAt && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">
                                Published At
                              </h4>
                              <p className="mt-1 text-sm text-gray-200">
                                {formatDate(selectedPage.publishedAt)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">
                        No page details available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
