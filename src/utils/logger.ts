import { info, error } from '@tauri-apps/plugin-log';
import { deviceIdentifier } from './deviceIdentifier';

export const logger = {
  info: (message: string, ...params: any) => {
    if (deviceIdentifier.isWeb) {
      console.log(message, params);
      return;
    }

    info(message + ` Extras: ${JSON.stringify(params)}`);
  },
  error: (message: string, ...params: any) => {
    if (deviceIdentifier.isWeb) {
      console.error(message, params);
      return;
    }

    error(message + ` Extras: ${JSON.stringify(params)}`);
  },
};
