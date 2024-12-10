import axios from 'axios';
import { Environment } from '../types/sync';
import { useSettingsStore } from '../stores/useSettingsStore';
import SHOPIFY_PROXIES from '../../shopify_proxy.json';

interface ShopifyRequestData {
  query: string;
  variables?: Record<string, any>;
}

interface ShopifyResponse<T> {
  data: T;
}

const proxyUrlReplacer = (url: string) => {
  const found = SHOPIFY_PROXIES.find((proxy) => url.includes(proxy.target));
  return found ? url.replace(found.target, `${found.path}`) : url;
};

const getEnvironmentConfig = (environment: Environment) => {
  const settings = useSettingsStore.getState().settings;
  if (!settings) throw new Error('Settings not initialized');

  return {
    production: {
      url: proxyUrlReplacer(settings.shopifyProductionStoreUrl),
      accessToken: settings.shopifyProductionAccessToken,
    },
    staging: {
      url: proxyUrlReplacer(settings.shopifyStagingStoreUrl),
      accessToken: settings.shopifyStagingAccessToken,
    },
  }[environment];
};

export const shopifyApi = {
  async post<T>(
    environment: Environment,
    data: ShopifyRequestData
  ): Promise<T> {
    const envConfig = getEnvironmentConfig(environment);

    const response = await axios<ShopifyResponse<T>>({
      url: envConfig.url,
      headers: {
        'X-Shopify-Access-Token': envConfig.accessToken,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      data,
    });

    return response.data.data;
  },
};
