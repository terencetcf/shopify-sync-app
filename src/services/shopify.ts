import axios from 'axios';
import { Environment } from '../types/sync';
import { useSettingsStore } from '../stores/useSettingsStore';
import SHOPIFY_PROXIES from '../../shopify_proxy.json';
import { logger } from '../utils/logger';

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

function isRetryableError(error: any): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // Retry on rate limits (429), server errors (500s), and network errors
    return (
      status === 429 ||
      (status && status >= 500 && status < 600) ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED'
    );
  }
  return false;
}

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
      const response = await axios<ShopifyResponse<T>>({
        url: envConfig.url,
        headers: {
          'X-Shopify-Access-Token': envConfig.accessToken,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        data,
      });

      if (response.data.errors?.length) {
        throw new Error(
          `Server returned the following errors: ` +
            response.data.errors.map((e) => `"${e.message}"`).join(', ')
        );
      }

      return response.data.data;
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
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

  // Handle the final error
  if (axios.isAxiosError(lastError)) {
    logger.error('Final API attempt failed:', lastError);
    if (
      lastError.response?.status === 404 ||
      lastError.code === 'ERR_NETWORK'
    ) {
      throw new Error('The requested URL is invalid');
    } else if (lastError.response?.status === 401) {
      throw new Error(
        'Unauthorized access, the provided access token is invalid'
      );
    }
  }

  throw lastError;
}

export const shopifyApi = {
  post<T>(environment: Environment, data: ShopifyRequestData): Promise<T> {
    return retryablePost<T>(environment, data);
  },
};
