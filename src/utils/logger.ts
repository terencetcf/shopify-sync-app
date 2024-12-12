import { info, warn, error } from '@tauri-apps/plugin-log';
import { deviceIdentifier } from './deviceIdentifier';

const formatMessage = (message: string, ...params: any) => {
  if (params.length === 0) {
    return message;
  }

  return `${message} Extra: ${JSON.stringify(params)}`;
};

export const logger = {
  info: (message: string, ...params: any) => {
    if (deviceIdentifier.isWeb) {
      params.length ? console.log(message, params) : console.log(message);
      return;
    }

    info(formatMessage(message, params));
  },
  warn: (message: string, ...params: any) => {
    if (deviceIdentifier.isWeb) {
      console.warn(message, params);
      return;
    }

    warn(formatMessage(message, params));
  },
  error: (message: string, ...params: any) => {
    if (deviceIdentifier.isWeb) {
      console.error(message, params);
      return;
    }

    error(formatMessage(message, params));
  },
};
