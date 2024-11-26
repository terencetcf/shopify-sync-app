import axios from 'axios';
import { Environment } from '../types/sync';

interface ShopifyRequestData {
  query: string;
  variables?: Record<string, any>;
}

interface ShopifyResponse<T> {
  data: T;
}

const ENVIRONMENT_CONFIGS: Record<
  Environment,
  { url: string; accessToken: string }
> = {
  production: {
    url: import.meta.env.VITE_SHOPIFY_STORE_URL,
    accessToken: import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
  },
  staging: {
    url: import.meta.env.VITE_SHOPIFY_STAGING_STORE_URL,
    accessToken: import.meta.env.VITE_SHOPIFY_STAGING_ACCESS_TOKEN,
  },
};

export const shopifyApi = {
  async post<T>(
    environment: Environment,
    data: ShopifyRequestData
  ): Promise<T> {
    const envConfig = ENVIRONMENT_CONFIGS[environment];

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
