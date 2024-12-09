import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function Settings() {
  const { settings, updateSettings, isLoading, error } = useSettingsStore();
  const [formData, setFormData] = useState({
    shopifyProductionStoreUrl: '',
    shopifyProductionAccessToken: '',
    shopifyStagingStoreUrl: '',
    shopifyStagingAccessToken: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {error && (
        <div className="bg-red-500 text-white p-4 rounded-md mb-4">{error}</div>
      )}

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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
