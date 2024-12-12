import axios from 'axios';
import { Environment } from '../types/environment';
import { useSettingsStore } from '../stores/useSettingsStore';
import SHOPIFY_PROXIES from '../../shopify_proxy.json';
import { logger } from '../utils/logger';
import { fetch } from '@tauri-apps/plugin-http';
import { deviceIdentifier } from '../utils/deviceIdentifier';

interface ShopifyRequestData {
  query: string;
  variables?: Record<string, any>;
}

interface ShopifyResponse<T> {
  data: T;
  errors: {
    message: string;
  }[];
}

const proxyUrlReplacer = (url: string) => {
  if (!deviceIdentifier.isWeb) return url;
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

const handleShopifyErrors = (errors: any[]) => {
  if (errors?.length) {
    throw new Error(
      `Server returned the following errors: ` +
        errors.map((e) => `"${e.message}"`).join(', ')
    );
  }
};

const makeRequest = async <T>(
  envConfig: ReturnType<typeof getEnvironmentConfig>,
  data: ShopifyRequestData
): Promise<T> => {
  if (deviceIdentifier.isWeb) {
    const response = await axios<ShopifyResponse<T>>({
      url: envConfig.url,
      headers: {
        'X-Shopify-Access-Token': envConfig.accessToken,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      data,
    });

    handleShopifyErrors(response.data.errors);
    return response.data.data;
  }

  const response = await fetch(envConfig.url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': envConfig.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const jsonResponse = await response.json();
  handleShopifyErrors(jsonResponse.errors);
  return jsonResponse.data;
};

const isRetryableError = (error: any): boolean => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    return (
      status === 429 ||
      (status && status >= 500 && status < 600) ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED'
    );
  }

  if (error.response) {
    const status = error.response.status;
    return status === 429 || (status >= 500 && status < 600);
  }

  return false;
};

const handleFinalError = (error: Error) => {
  if (axios.isAxiosError(error)) {
    logger.error('Final API attempt failed:', error);
    if (error.response?.status === 404 || error.code === 'ERR_NETWORK') {
      throw new Error('The requested URL is invalid');
    }
    if (error.response?.status === 401) {
      throw new Error(
        'Unauthorized access, the provided access token is invalid'
      );
    }
  }
  throw error;
};

async function retryablePost<T>(
  environment: Environment,
  data: ShopifyRequestData,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  const envConfig = getEnvironmentConfig(environment);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await makeRequest<T>(envConfig, data);
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        break;
      }

      const delay =
        baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
      logger.warn(
        `API call failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(
          delay
        )}ms...`,
        error.message
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return handleFinalError(lastError!);
}

export const shopifyApi = {
  post<T>(environment: Environment, data: ShopifyRequestData): Promise<T> {
    return retryablePost<T>(environment, data);
  },
};
