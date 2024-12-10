import { ComparisonResult } from '../../types/pages';
import TableHeader from './TableHeader';
import TableRow from './TableRow';

export interface ComparisonTableProps {
  results: ComparisonResult[];
  selectedItems: Set<string>;
  onSelectAll: () => void;
  onSelectItem: (handle: string) => void;
  onRowClick: (page: ComparisonResult) => void;
}

export default function ComparisonTable({
  results,
  selectedItems,
  onSelectAll,
  onSelectItem,
  onRowClick,
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
                  isSelected={selectedItems.has(result.handle)}
                  onSelect={() => onSelectItem(result.handle)}
                  onClick={() => onRowClick(result)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
