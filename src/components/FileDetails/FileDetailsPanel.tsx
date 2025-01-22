import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';
import { FileComparison } from '../../types/file';
import { extractFileName } from '../../utils/fileUtils';

interface FileDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileComparison | null;
}

export default function FileDetailsPanel({
  isOpen,
  onClose,
  file,
}: FileDetailsPanelProps) {
  if (!file) return null;

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
                      {extractFileName(file.url)}
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
                  <div className="space-y-6 pt-6 pb-5">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Production Side */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-200">Production</h3>
                        {file.production_id ? (
                          <>
                            <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                              <img
                                src={file.url}
                                alt={file.alt}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">URL</h4>
                              <p className="mt-1 text-sm text-gray-200 break-all">
                                {file.url}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">Alt Text</h4>
                              <p className="mt-1 text-sm text-gray-200">
                                {file.alt || <em className="text-gray-500">No alt text</em>}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Not available in production
                          </div>
                        )}
                      </div>

                      {/* Staging Side */}
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-200">Staging</h3>
                        {file.staging_id ? (
                          <>
                            <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden">
                              <img
                                src={file.url}
                                alt={file.alt}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">URL</h4>
                              <p className="mt-1 text-sm text-gray-200 break-all">
                                {file.url}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-400">Alt Text</h4>
                              <p className="mt-1 text-sm text-gray-200">
                                {file.alt || <em className="text-gray-500">No alt text</em>}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Not available in staging
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
} 