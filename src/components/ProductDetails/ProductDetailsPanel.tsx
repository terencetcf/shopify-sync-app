import { Fragment, useEffect } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useProductsSyncStore } from '../../stores/useProductsSyncStore';
import { formatDate } from '../../utils/formatDate';
import { ProductComparison } from '../../types/product';

interface ProductDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductComparison | null;
}

export default function ProductDetailsPanel({
  isOpen,
  onClose,
  product,
}: ProductDetailsPanelProps) {
  const { selectedProduct, isLoadingDetails, error, fetchProductDetails } =
    useProductsSyncStore();

  useEffect(() => {
    if (isOpen && product) {
      if (product.production_id) {
        fetchProductDetails(product.production_id, 'production');
      } else {
        fetchProductDetails(product.staging_id!, 'staging');
      }
    }
  }, [isOpen, product, fetchProductDetails]);

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
                      {selectedProduct?.title || 'Product Details'}
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
                {isLoadingDetails ? (
                  <div className="flex-1 px-4 sm:px-6">
                    <div className="h-full flex items-center justify-center">
                      <div className="text-gray-400">Loading...</div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex-1 px-4 sm:px-6">
                    <div className="h-full flex items-center justify-center">
                      <div className="text-red-400">{error}</div>
                    </div>
                  </div>
                ) : selectedProduct ? (
                  <div className="flex-1 px-4 sm:px-6">
                    <div className="space-y-6">
                      <div className="border-b border-gray-700 pb-6">
                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Handle
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.handle}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Last Updated
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {formatDate(selectedProduct.updatedAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Status
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.status}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Vendor
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.vendor}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Product Type
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.productType}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Media */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Media
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.media?.edges.length ? (
                            <div className="grid grid-cols-2 gap-4">
                              {selectedProduct.media.edges.map(({ node }) => (
                                <div
                                  key={`${node.mediaContentType}-${node.status}`}
                                  className="relative aspect-square"
                                >
                                  {node.preview?.image && (
                                    <img
                                      src={node.preview.image.url}
                                      alt={
                                        node.preview.image.altText ||
                                        selectedProduct.title
                                      }
                                      className="object-cover rounded-lg"
                                    />
                                  )}
                                  <div className="absolute top-2 right-2">
                                    <span className="inline-flex items-center rounded-md bg-gray-700/70 px-2 py-1 text-xs font-medium text-gray-200">
                                      {node.mediaContentType}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No media</p>
                          )}
                        </div>
                      </div>

                      {/* Collections */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Collections
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.collections?.edges.length > 0 ? (
                            <ul className="space-y-2">
                              {selectedProduct.collections.edges.map(
                                ({ node }) => (
                                  <li
                                    key={node.handle}
                                    className="text-sm text-gray-300"
                                  >
                                    {node.handle}
                                  </li>
                                )
                              )}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-400">
                              No collections
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Tags
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.tags?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedProduct.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium text-gray-200"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No tags</p>
                          )}
                        </div>
                      </div>

                      {/* Category & Role */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Category & Role
                        </h3>
                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Category
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.category?.name || 'None'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Combined Listing Role
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.combinedListingRole}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Product Options */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Options
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.options?.length ? (
                            <div className="space-y-4">
                              {selectedProduct.options.map((option) => (
                                <div key={option.name}>
                                  <h4 className="text-sm font-medium text-gray-300">
                                    {option.name}
                                  </h4>
                                  <div className="mt-2 space-y-2">
                                    <div className="text-sm text-gray-400">
                                      Position: {option.position}
                                    </div>
                                    <div className="text-sm text-gray-400">
                                      Values: {option.values.join(', ')}
                                    </div>
                                    {option.linkedMetafield && (
                                      <div className="text-sm text-gray-400">
                                        Linked Metafield:{' '}
                                        {option.linkedMetafield.namespace}.
                                        {option.linkedMetafield.key}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No options</p>
                          )}
                        </div>
                      </div>

                      {/* SEO */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          SEO
                        </h3>
                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Title
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.seo?.title || 'None'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Description
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.seo?.description || 'None'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Metafields */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Metafields
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.metafields?.edges.length > 0 ? (
                            <div className="space-y-4">
                              {selectedProduct.metafields.edges.map(
                                ({ node }) => (
                                  <div key={`${node.namespace}.${node.key}`}>
                                    <h4 className="text-sm font-medium text-gray-300">
                                      {node.namespace}.{node.key}
                                    </h4>
                                    <div className="mt-1 text-sm text-gray-400">
                                      Type: {node.type}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-400">
                                      Value: {node.value}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">
                              No metafields
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Gift Card Settings */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Gift Card Settings
                        </h3>
                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Is Gift Card
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.isGiftCard ? 'Yes' : 'No'}
                            </dd>
                          </div>
                          {selectedProduct.isGiftCard && (
                            <div>
                              <dt className="text-sm font-medium text-gray-400">
                                Template Suffix
                              </dt>
                              <dd className="mt-1 text-sm text-gray-200">
                                {selectedProduct.giftCardTemplateSuffix ||
                                  'None'}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Template Settings */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Template Settings
                        </h3>
                        <dl className="mt-4 space-y-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Template Suffix
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.templateSuffix || 'None'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-400">
                              Requires Selling Plan
                            </dt>
                            <dd className="mt-1 text-sm text-gray-200">
                              {selectedProduct.requiresSellingPlan
                                ? 'Yes'
                                : 'No'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Variants */}
                      <div className="border-b border-gray-700 pb-6">
                        <h3 className="text-lg font-medium text-gray-200">
                          Variants
                        </h3>
                        <div className="mt-4">
                          {selectedProduct.variants?.edges.length > 0 ? (
                            <div className="space-y-4">
                              {selectedProduct.variants.edges.map(
                                ({ node }) => (
                                  <div
                                    key={node.id}
                                    className="border-l-2 border-gray-700 pl-4"
                                  >
                                    <h4 className="text-sm font-medium text-gray-300">
                                      {node.title}
                                    </h4>
                                    <dl className="mt-2 space-y-2">
                                      <div>
                                        <dt className="text-sm font-medium text-gray-400">
                                          SKU
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-200">
                                          {node.sku}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-sm font-medium text-gray-400">
                                          Price
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-200">
                                          {node.price}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-sm font-medium text-gray-400">
                                          Compare At Price
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-200">
                                          {node.compareAtPrice || 'None'}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt className="text-sm font-medium text-gray-400">
                                          Inventory
                                        </dt>
                                        <dd className="mt-1 text-sm text-gray-200">
                                          {node.inventoryQuantity}
                                        </dd>
                                      </div>
                                    </dl>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No variants</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
