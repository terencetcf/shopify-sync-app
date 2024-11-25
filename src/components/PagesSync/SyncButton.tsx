interface SyncButtonProps {
  selectedCount: number;
  isSyncing: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export default function SyncButton({
  selectedCount,
  isSyncing,
  isDisabled,
  onClick,
}: SyncButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={selectedCount === 0 || isSyncing || isDisabled}
      className="inline-flex items-center rounded-md bg-green-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
      title={
        isDisabled
          ? 'Syncing from staging to production is temporarily disabled'
          : ''
      }
    >
      {isSyncing ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
          Syncing...
        </>
      ) : (
        <>
          Sync Selected ({selectedCount}){isDisabled && ' (Disabled)'}
        </>
      )}
    </button>
  );
}
