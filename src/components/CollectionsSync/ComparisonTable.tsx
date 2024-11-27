import { ComparisonResult } from '../../types/sync';
import { TableRow, TableHeader } from './';

interface ComparisonTableProps {
  results: ComparisonResult[];
  selectedItems: Set<string>;
  onSelectAll: () => void;
  onSelectItem: (id: string) => void;
}

export default function ComparisonTable({
  results,
  selectedItems,
  onSelectAll,
  onSelectItem,
}: ComparisonTableProps) {
  if (results.length === 0) return null;

  return (
    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-700">
            <TableHeader
              selectedCount={selectedItems.size}
              totalCount={results.length}
              onSelectAll={onSelectAll}
            />
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {results.map((result) => (
                <TableRow
                  key={result.id}
                  result={result}
                  isSelected={selectedItems.has(result.id)}
                  onSelect={() => onSelectItem(result.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
