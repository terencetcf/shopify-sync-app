interface SyncProgressProps {
  current: number;
  total: number;
  type: 'collections' | 'pages' | 'products';
  message?: string;
}

export function SyncProgress({
  current,
  total,
  type,
  message,
}: SyncProgressProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="bg-gray-800 border border-gray-700 shadow-lg rounded-lg p-4 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <div className="animate-pulse">
            <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-gray-200">
            {message || `Syncing ${type} (${current}/${total})`}
          </span>
        </div>
        <span className="text-sm font-semibold text-emerald-400">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-2 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
