import { ComparisonResult } from '../../types/pages';

interface TableHeaderProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}

export default function TableHeader({
  selectedCount,
  totalCount,
  onSelectAll,
}: TableHeaderProps) {
  return (
    <thead className="bg-gray-800">
      <tr>
        <th scope="col" className="relative px-7 sm:w-12 sm:px-6">
          <input
            type="checkbox"
            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            checked={selectedCount === totalCount && totalCount > 0}
            onChange={onSelectAll}
          />
        </th>
        <th
          scope="col"
          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-200 sm:pl-6"
        >
          Title
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200"
        >
          Status
        </th>
        <th
          scope="col"
          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-200"
        >
          Last Updated
        </th>
      </tr>
    </thead>
  );
}
