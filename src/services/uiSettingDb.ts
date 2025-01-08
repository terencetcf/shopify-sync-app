import { deviceIdentifier } from '../utils/deviceIdentifier';
import AppDb from './AppDb';

const getUiSetting = async <T>(key: string): Promise<T | null> => {
  if (deviceIdentifier.isWeb) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }

  const [result] = await AppDb.select<{ value: string }[]>(
    'SELECT value FROM ui_settings WHERE key = $1',
    [key]
  );

  return result ? JSON.parse(result.value) : null;
};

const setUiSetting = async <T>(key: string, value: T): Promise<void> => {
  if (deviceIdentifier.isWeb) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return;
  }

  await AppDb.execute(
    `INSERT INTO ui_settings (
      key,
      value,
      updated_at
    ) VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = $2,
      updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value)]
  );
};

export const uiSettingDb = {
  getUiSetting,
  setUiSetting,
};
