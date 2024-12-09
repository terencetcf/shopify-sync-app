import { info, error } from '@tauri-apps/plugin-log';

export const logger = {
  info: (message: string, ...params: any) => {
    console.log(message, params);
    info(message + ` Extras: ${JSON.stringify(params)}`);
  },
  error: (message: string, ...params: any) => {
    logger.error(message, params);
    error(message + ` Extras: ${JSON.stringify(params)}`);
  },
};
