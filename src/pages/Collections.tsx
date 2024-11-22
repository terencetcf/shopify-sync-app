import { useEffect, useState } from 'react';
import { useCollectionsStore } from '../stores/useCollectionsStore';
import CollectionDetailsPanel from '../components/CollectionDetails/CollectionDetailsPanel';

export default function Collections() {
  const { collections, isLoading, error, fetchCollections } =
    useCollectionsStore();

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
                        {collection.productsCount}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300">
                        {new Date(collection.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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
