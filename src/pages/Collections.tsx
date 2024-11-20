import { useEffect, useState } from 'react';
import { useCollectionsStore } from '../stores/useCollectionsStore';
import ProductsModal from '../components/ProductsModal';

export default function Collections() {
  const { collections, isLoading, error, fetchCollections } =
    useCollectionsStore();
  const [selectedCollection, setSelectedCollection] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-100">Collections</h1>
          <p className="mt-2 text-sm text-gray-300">
            A list of all collections in your Shopify store
          </p>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6 w-1/4"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200 w-1/4"
                    >
                      Handle
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200 w-1/4"
                    >
                      Products
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200 w-1/4"
                    >
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800">
                  {collections.map((collection) => (
                    <tr
                      key={collection.id}
                      className="hover:bg-gray-700 cursor-pointer"
                      onClick={() =>
                        setSelectedCollection({
                          id: collection.id,
                          title: collection.title,
                        })
                      }
                    >
                      <td className="py-4 pl-4 pr-3 text-sm text-gray-100 sm:pl-6 text-left align-top">
                        {collection.title}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300 text-left align-top">
                        {collection.handle}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300 text-left align-top">
                        {collection.productsCount}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-300 text-left align-top">
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

      <ProductsModal
        isOpen={selectedCollection !== null}
        onClose={() => setSelectedCollection(null)}
        collection={selectedCollection}
      />
    </div>
  );
}
