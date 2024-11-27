import { useEffect, useState } from 'react';
import { useCollectionsStore } from '../stores/useCollectionsStore';
import CollectionDetailsPanel from '../components/CollectionDetails/CollectionDetailsPanel';
import { formatDate } from '../utils/formatDate';
import ExportButton from '../components/ExportButton';
import { downloadCsv } from '../utils/downloadCsv';

export default function Collections() {
  const {
    collections,
    error,
    isLoading,
    hasNextPage,
    endCursor,
    fetchCollections,
  } = useCollectionsStore();

  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCollectionClick = (id: string) => {
    setSelectedCollectionId(id);
    setIsDetailsPanelOpen(true);
  };

  const handleLoadMore = () => {
    if (hasNextPage) {
      fetchCollections(endCursor);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Handle', 'Title', 'Products Count', 'Last Updated'],
      ...collections.map((collection) => [
        collection.handle,
        collection.title,
        collection.productsCount.count,
        formatDate(collection.updatedAt),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    downloadCsv({
      filename: 'collections',
      data: csvContent,
    });
  };

  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <div className="border-l-4 border-blue-500 pl-4">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              Collections
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl">
              View and manage your Shopify collections. Monitor product counts
              and collection details.
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <ExportButton onClick={handleExport} />
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6">
                      Title
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                      Handle
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                      Products Count
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleCollectionClick(collection.id)}
                    >
                      <td className="py-4 pl-4 pr-3 text-sm text-gray-100 sm:pl-6">
                        {collection.title}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300">
                        {collection.handle}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300">
                        {collection.productsCount.count}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300">
                        {formatDate(collection.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <div className="inline-flex items-center px-3 py-2 rounded-md bg-gray-800 text-sm text-gray-300">
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
          Total Collections: {collections.length}
        </div>
      </div>

      <CollectionDetailsPanel
        isOpen={isDetailsPanelOpen}
        onClose={() => {
          setIsDetailsPanelOpen(false);
          setSelectedCollectionId(null);
        }}
        collectionId={selectedCollectionId}
      />
    </div>
  );
}
