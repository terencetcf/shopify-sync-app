import { useLocation } from 'react-router-dom';
import { useSettingsStore } from '../stores/useSettingsStore';

function SettingsAlert() {
  const { settings } = useSettingsStore();
  const location = useLocation();

  if (location.pathname === '/settings') {
    return null;
  }

  const getMissingSettings = () => {
    if (!settings) return [];

    const required = [
      { key: 'shopifyProductionStoreUrl', label: 'Production Store URL' },
      { key: 'shopifyProductionAccessToken', label: 'Production Access Token' },
      { key: 'shopifyStagingStoreUrl', label: 'Staging Store URL' },
      { key: 'shopifyStagingAccessToken', label: 'Staging Access Token' },
    ];

    return required
      .filter(({ key }) => !settings[key as keyof typeof settings])
      .map(({ label }) => label);
  };

  const missingSettings = getMissingSettings();

  if (missingSettings.length === 0) {
    return null;
  }

  return (
    <div className="mx-8 my-4 rounded-md bg-yellow-500/10 px-6 py-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-12 w-12 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="mt-2 text-xl font-semibold leading-6 text-yellow-400">
            Missing Settings
          </h3>
          <div className="mt-2">
            <p className="text-gray-400 mb-4">
              Please configure the following settings to continue:{' '}
              <span className="text-white mb-4">
                {missingSettings.join(', ')}
              </span>
            </p>
            <a
              href="/settings"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go to Settings
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsAlert;
