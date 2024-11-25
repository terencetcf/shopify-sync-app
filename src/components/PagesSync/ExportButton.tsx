import { ComparisonResult } from '../../types/pages';

interface ExportButtonProps {
  onExport: () => void;
  disabled: boolean;
}

export default function ExportButton({
  onExport,
  disabled,
}: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className="inline-flex items-center rounded-md bg-gray-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Export to CSV
    </button>
  );
}
