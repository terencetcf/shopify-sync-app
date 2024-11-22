import { ComparisonResult } from '../../types/products';

interface TableRowProps {
  result: ComparisonResult;
  isSelected: boolean;
  onSelect: () => void;
}

export default function TableRow({
  result,
  isSelected,
  onSelect,
}: TableRowProps) {
  return (
    <tr key={result.handle} className="hover:bg-gray-700">
      <td className="relative px-7 sm:w-12 sm:px-6">
        <input
          type="checkbox"
          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td className="py-4 pl-4 pr-3 text-sm text-gray-100 sm:pl-6">
        {result.title}
        <span className="block text-xs text-gray-400">{result.handle}</span>
      </td>
      <td className="px-3 py-4 text-sm text-gray-300">
        {result.status === 'missing_in_staging'
          ? result.productionInventory
          : result.stagingInventory}
      </td>
      <td className="px-3 py-4 text-sm text-gray-300">
        {result.updatedAt
          ? new Date(result.updatedAt).toLocaleDateString()
          : '-'}
      </td>
    </tr>
  );
}
