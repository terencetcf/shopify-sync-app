import { ComparisonResult } from '../../types/collections';

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
    <tr key={result.id} className="hover:bg-gray-700">
      <td className="relative px-7 sm:w-12 sm:px-6">
        <input
          type="checkbox"
          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
          checked={isSelected}
          onChange={onSelect}
        />
      </td>
      <td className="py-4 pl-4 pr-3 text-sm sm:pl-6 max-w-xs">
        <div className="flex flex-col">
          <div
            className="font-medium text-gray-100 truncate"
            title={result.title}
          >
            {result.title}
          </div>
          <div className="text-gray-400">{result.handle}</div>
          <div className="text-gray-500 text-xs">{result.id}</div>
          {result.status === 'different' && result.differences && (
            <div className="text-yellow-400 text-xs mt-1">
              Differences in: {result.differences.join(', ')}
            </div>
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
        {result.productionCount?.count || result.stagingCount?.count || '-'}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm">
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            result.status === 'different'
              ? 'bg-yellow-400/10 text-yellow-400'
              : result.status === 'missing_in_staging'
              ? 'bg-red-400/10 text-red-400'
              : 'bg-blue-400/10 text-blue-400'
          }`}
        >
          {result.status === 'different'
            ? 'Different'
            : result.status === 'missing_in_staging'
            ? 'Missing in Staging'
            : 'Missing in Production'}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
        {result.updatedAt
          ? new Date(result.updatedAt).toLocaleDateString()
          : '-'}
      </td>
    </tr>
  );
}
