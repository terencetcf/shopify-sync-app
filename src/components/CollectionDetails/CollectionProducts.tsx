import { DetailedCollection } from '../../types/collection';

interface CollectionProductsProps {
  collection: DetailedCollection;
}

export default function CollectionProducts({
  collection,
}: CollectionProductsProps) {
  if (!collection.products?.edges.length) return null;

  return (
    <div className="border-b border-gray-700 pb-6">
      <h3 className="text-lg font-medium text-gray-200 mb-4">Products</h3>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
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
          <tbody className="divide-y divide-gray-700 bg-gray-800">
            {collection.products.edges.map(({ node }) => (
              <tr key={node.id}>
                <td className="py-4 pl-4 pr-3 text-sm text-gray-100">
                  {node.title}
                </td>
                <td className="px-3 py-4 text-sm text-gray-300">
                  {node.handle}
                </td>
                <td className="px-3 py-4 text-sm">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                      node.status === 'ACTIVE'
                        ? 'bg-green-400/10 text-green-400'
                        : 'bg-red-400/10 text-red-400'
                    }`}
                  >
                    {node.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-300">
                  {node.totalInventory}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
