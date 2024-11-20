import { useEffect } from 'react';
import axios from 'axios';
import { create } from 'zustand';

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
}

interface ProductsModalStore {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (collectionId: string) => Promise<void>;
}

const useProductsStore = create<ProductsModalStore>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async (collectionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data } = await axios({
        url: import.meta.env.VITE_SHOPIFY_STORE_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
        },
        data: {
          query: `
            query getProducts($id: ID!) {
              collection(id: $id) {
                products(first: 100) {
                  edges {
                    node {
                      id
                      title
                      handle
                      status
                      totalInventory
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

      const productsData = data.data.collection.products.edges.map(
        (edge: { node: Product }) => edge.node
      );
      set({ products: productsData, isLoading: false });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message || 'Failed to fetch products';
      set({ error: errorMessage, isLoading: false });
      console.error('Error fetching products:', err);
    }
  },
}));

interface ProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: {
    id: string;
    title: string;
  } | null;
}

export default function ProductsModal({
  isOpen,
  onClose,
  collection,
}: ProductsModalProps) {
  const { products, isLoading, error, fetchProducts } = useProductsStore();

  useEffect(() => {
    if (isOpen && collection) {
      fetchProducts(collection.id);
    }
  }, [isOpen, collection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block transform overflow-hidden rounded-lg bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg font-medium leading-6 text-gray-100">
                  Products in {collection?.title}
                </h3>
                <div className="mt-4">
                  {isLoading ? (
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : error ? (
                    <div className="text-red-500 text-center">{error}</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200">
                            Title
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Handle
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Status
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200">
                            Inventory
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-700">
                            <td className="py-4 pl-4 pr-3 text-sm text-gray-100 text-left">
                              {product.title}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-300 text-left">
                              {product.handle}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-300 text-left">
                              {product.status}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-300 text-left">
                              {product.totalInventory}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-base font-medium text-gray-200 shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
