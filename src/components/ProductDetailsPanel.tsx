import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment, useEffect } from 'react';
import { useProductsStore } from '../stores/useProductsStore';

interface ProductDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
}

export default function ProductDetailsPanel({
  isOpen,
  onClose,
  productId,
}: ProductDetailsPanelProps) {
  const { selectedProduct, isLoadingDetails, fetchProductDetails } =
    useProductsStore();

  useEffect(() => {
    if (isOpen && productId) {
      fetchProductDetails(productId);
    }
  }, [isOpen, productId, fetchProductDetails]);

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
                    <Dialog.Title className="text-base font-semibold leading-6 text-gray-100">
                      Product Details
                    </Dialog.Title>
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
                        Loading product details...
                      </p>
                    </div>
                  ) : selectedProduct ? (
                    <div className="space-y-6 pt-6 pb-5">
                      {/* Title Section */}
                      <div className="space-y-6 border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          {selectedProduct.title}
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Description
                            </h4>
                            <div
                              className="mt-1 text-sm text-gray-200 prose prose-invert max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: selectedProduct.descriptionHtml,
                              }}
                            />
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Status
                            </h4>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium mt-1 ${
                                selectedProduct.status === 'ACTIVE'
                                  ? 'bg-green-400/10 text-green-400'
                                  : 'bg-red-400/10 text-red-400'
                              }`}
                            >
                              {selectedProduct.status.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Images */}
                      {selectedProduct.images?.edges.length > 0 && (
                        <div className="border-b border-gray-700 pb-6">
                          <h3 className="text-lg font-medium text-gray-200 mb-4">
                            Images
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedProduct.images.edges.map(({ node }) => (
                              <div
                                key={node.id}
                                className="relative aspect-square"
                              >
                                <img
                                  src={node.url}
                                  alt={node.altText || selectedProduct.title}
                                  className="object-cover rounded-lg"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200 mb-4">
                          Pricing
                        </h3>
                        <div>
                          <h4 className="text-sm font-medium text-gray-400">
                            Price Range
                          </h4>
                          <p className="mt-1 text-sm text-gray-200">
                            {`${selectedProduct.priceRangeV2.minVariantPrice.currencyCode} ${selectedProduct.priceRangeV2.minVariantPrice.amount}`}
                            {selectedProduct.priceRangeV2.maxVariantPrice
                              .amount !==
                              selectedProduct.priceRangeV2.minVariantPrice
                                .amount &&
                              ` - ${selectedProduct.priceRangeV2.maxVariantPrice.amount}`}
                          </p>
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
                              {selectedProduct.handle}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Vendor
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedProduct.vendor}
                            </p>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Product Type
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {selectedProduct.productType}
                            </p>
                          </div>

                          {selectedProduct.tags?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">
                                Tags
                              </h4>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedProduct.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-gray-200"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-medium text-gray-400">
                              Last Updated
                            </h4>
                            <p className="mt-1 text-sm text-gray-200">
                              {new Date(
                                selectedProduct.updatedAt
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-400">
                        No product details available
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
