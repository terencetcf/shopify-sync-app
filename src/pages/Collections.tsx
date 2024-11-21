import { useEffect, useState } from 'react';
import { useCollectionsStore } from '../stores/useCollectionsStore';
import ProductsModal from '../components/ProductsModal';
import axios from 'axios';

interface CollectionProduct {
  id: string;
  handle: string;
}

interface CollectionWithProducts {
  id: string;
  handle: string;
  products: CollectionProduct[];
}

export default function Collections() {
  const {
    collections,
    isLoading,
    error,
    fetchCollections,
    hasNextPage,
    endCursor,
  } = useCollectionsStore();
  const [selectedCollection, setSelectedCollection] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const loadMore = () => {
    if (hasNextPage && !isLoading) {
      fetchCollections(endCursor);
    }
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Handle', 'Products Count', 'Last Updated'];
    const csvData = collections.map((collection) => [
      collection.title,
      collection.handle,
      collection.productsCount,
      new Date(collection.updatedAt).toLocaleDateString(),
    ]);

    csvData.unshift(headers);
    const csvString = csvData.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `collections_${new Date().toISOString()}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const fetchCollectionProducts = async (
    collectionId: string
  ): Promise<CollectionProduct[]> => {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: `
          query getCollectionProducts($id: ID!) {
            collection(id: $id) {
              products(first: 250) {
                edges {
                  node {
                    id
                    handle
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: collectionId,
        },
      },
    });

    return data.data.collection.products.edges.map(
      (edge: { node: CollectionProduct }) => edge.node
    );
  };

  const exportCollectionsAndProducts = async () => {
    setExportLoading(true);
    try {
      const collectionsWithProducts: CollectionWithProducts[] = [];

      // Fetch products for each collection
      for (const collection of collections) {
        const products = await fetchCollectionProducts(collection.id);
        collectionsWithProducts.push({
          id: collection.id,
          handle: collection.handle,
          products,
        });
      }

      // Prepare CSV data
      const headers = [
        'Collection ID',
        'Collection Handle',
        'Product ID',
        'Product Handle',
      ];
      const csvData: string[][] = [];

      collectionsWithProducts.forEach((collection) => {
        if (collection.products.length === 0) {
          // Add row for collection without products
          csvData.push([collection.id, collection.handle, '', '']);
        } else {
          // Add row for each product in collection
          collection.products.forEach((product) => {
            csvData.push([
              collection.id,
              collection.handle,
              product.id,
              product.handle,
            ]);
          });
        }
      });

      csvData.unshift(headers);
      const csvString = csvData.map((row) => row.join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
          'download',
          `collections_and_products_${new Date().toISOString()}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting collections and products:', error);
    } finally {
      setExportLoading(false);
    }
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
              Manage and organize your Shopify collections. View product counts,
              update timestamps, and export data for analysis. Click on any
              collection to view its products.
            </p>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none space-x-4">
          <button
            type="button"
            onClick={exportCollectionsAndProducts}
            disabled={exportLoading}
            className="inline-flex items-center rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                Exporting...
              </>
            ) : (
              <>
                <svg
                  className="-ml-0.5 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Export Collections & Products
              </>
            )}
          </button>
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg
              className="-ml-0.5 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export Collections
          </button>
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

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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

      <ProductsModal
        isOpen={selectedCollection !== null}
        onClose={() => setSelectedCollection(null)}
        collection={selectedCollection}
      />
    </div>
  );
}
