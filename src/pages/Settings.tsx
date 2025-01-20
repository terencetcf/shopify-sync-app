import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import Notification from '../components/Notification';
import { isTrueOrDefault } from '../utils/compareUtils';
import { logger } from '../utils/logger';

export default function Settings() {
  const { settings, updateSettings, isLoading, error } = useSettingsStore();
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    shopifyProductionStoreUrl:
      import.meta.env.VITE_SHOPIFY_PRODUCTION_URL ?? '',
    shopifyProductionAccessToken:
      import.meta.env.VITE_SHOPIFY_PRODUCTION_ACCESS_TOKEN ?? '',
    shopifyStagingStoreUrl:
      import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL ?? '',
    shopifyStagingAccessToken:
      import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN ?? '',
    syncProductImages: isTrueOrDefault(
      import.meta.env.VITE_SHOPIFY_SYNC_PRODUCT_IMAGES,
      true
    ),
  });

  useEffect(() => {
    if (settings && Object.values(settings).every((s) => !!s)) {
      logger.info('settings =>', settings);
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setShowErrorNotification(true);
    }
  }, [error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      logger.info('🚀 - formData:', formData);
      await updateSettings(formData);
      setShowSaveNotification(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
      setShowErrorNotification(true);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-700">
        <h1 className="text-2xl font-semibold text-gray-200">Settings</h1>
        <div className="flex text-sm text-gray-400 mt-4">
          Settings which will be used to connect to Shopify graphql API
        </div>
      </div>
      <div className="my-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Production Environment
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="shopifyProductionStoreUrl"
                  className="block text-sm font-medium text-gray-300"
                >
                  Store URL
                </label>
                <input
                  type="text"
                  id="shopifyProductionStoreUrl"
                  name="shopifyProductionStoreUrl"
                  value={formData.shopifyProductionStoreUrl}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://your-store.myshopify.com/admin/api/2024-01/graphql.json"
                />
              </div>
              <div>
                <label
                  htmlFor="shopifyProductionAccessToken"
                  className="block text-sm font-medium text-gray-300"
                >
                  Access Token
                </label>
                <input
                  type="password"
                  id="shopifyProductionAccessToken"
                  name="shopifyProductionAccessToken"
                  value={formData.shopifyProductionAccessToken}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Staging Environment
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="shopifyStagingStoreUrl"
                  className="block text-sm font-medium text-gray-300"
                >
                  Store URL
                </label>
                <input
                  type="text"
                  id="shopifyStagingStoreUrl"
                  name="shopifyStagingStoreUrl"
                  value={formData.shopifyStagingStoreUrl}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://your-staging-store.myshopify.com/admin/api/2024-01/graphql.json"
                />
              </div>
              <div>
                <label
                  htmlFor="shopifyStagingAccessToken"
                  className="block text-sm font-medium text-gray-300"
                >
                  Access Token
                </label>
                <input
                  type="password"
                  id="shopifyStagingAccessToken"
                  name="shopifyStagingAccessToken"
                  value={formData.shopifyStagingAccessToken}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Sync Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="syncProductImages"
                  name="syncProductImages"
                  checked={isTrueOrDefault(formData.syncProductImages, false)}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      syncProductImages: e.target.checked,
                    }));
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <label
                  htmlFor="syncProductImages"
                  className="ml-2 block text-sm font-medium text-gray-300"
                >
                  Sync product images when syncing products
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <Notification
          show={showSaveNotification}
          title="Settings Saved"
          message="Your settings have been saved successfully"
          onClose={() => setShowSaveNotification(false)}
        />

        <Notification
          show={showErrorNotification}
          title="Error"
          message={errorMessage}
          onClose={() => setShowErrorNotification(false)}
          type="error"
        />
      </div>
    </div>
  );
}
