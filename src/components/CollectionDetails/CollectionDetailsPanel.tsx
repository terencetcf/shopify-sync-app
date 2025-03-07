import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect } from 'react';
import { useCollectionsSyncStore } from '../../stores/useCollectionsSyncStore';
import CollectionProducts from './CollectionProducts';
import { formatDate } from '../../utils/formatDate';
import { CollectionComparison } from '../../types/collection';

interface CollectionDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionComparison | null;
}

export default function CollectionDetailsPanel({
  isOpen,
  onClose,
  collection,
}: CollectionDetailsPanelProps) {
  const { selectedCollection, isLoadingDetails, fetchCollectionDetails } =
    useCollectionsSyncStore();

  useEffect(() => {
    if (isOpen && collection) {
      if (collection?.production_id) {
        fetchCollectionDetails(collection.production_id, 'production');
      } else {
        fetchCollectionDetails(collection.staging_id!, 'staging');
      }
    }
  }, [isOpen, collection, fetchCollectionDetails]);

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
                      {selectedCollection?.title || 'Collection Details'}
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
                        Loading collection details...
                      </p>
                    </div>
                  ) : selectedCollection ? (
                    <div className="space-y-6 pt-6 pb-5">
                      {/* Title Section */}
                      <div className="space-y-6 border-b border-gray-700 pb-6">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Handle
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedCollection.handle}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Last Updated
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {formatDate(selectedCollection.updatedAt)}
                            </p>
                          </div>

                          {selectedCollection.descriptionHtml && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">
                                Description
                              </h4>
                              <div
                                className="bg-gray-900 p-4 rounded-md mt-1 text-sm text-gray-200 prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{
                                  __html: selectedCollection.descriptionHtml,
                                }}
                              />
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Products Count
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedCollection.productsCount.count}
                            </p>
                          </div>
                        </div>
                      </div>

                      <CollectionProducts collection={selectedCollection} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">
                        No collection details available
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
