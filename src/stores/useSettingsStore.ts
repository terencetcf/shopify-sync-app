import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import { logger } from '../utils/logger';

interface Settings {
  shopifyProductionStoreUrl: string;
  shopifyProductionAccessToken: string;
  shopifyStagingStoreUrl: string;
  shopifyStagingAccessToken: string;
}

interface SettingsStore {
  settings: Settings | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
}

let db: Database | null = null;

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });

    if (deviceIdentifier.isWeb) {
      set({
        settings: {
          shopifyProductionStoreUrl: import.meta.env
            .VITE_SHOPIFY_PRODUCTION_URL,
          shopifyProductionAccessToken: import.meta.env
            .VITE_SHOPIFY_PRODUCTION_ACCESS_TOKEN,
          shopifyStagingStoreUrl: import.meta.env
            .VITE_SHOPIFY_STAGING_STORE_URL,
          shopifyStagingAccessToken: import.meta.env
            .VITE_SHOPIFY_STAGING_ACCESS_TOKEN,
        },
        isLoading: false,
      });
      return;
    }

    try {
      // Initialize database connection
      db = await Database.load('sqlite:settings.db');

      // Get all settings
      const result: { key: string; value: string }[] = await db.select(
        'SELECT key, value FROM settings'
      );

      // Convert array of {key, value} to settings object
      const settings = result.reduce(
        (acc, { key, value }) => ({
          ...acc,
          [key]: value,
        }),
        {}
      ) as Settings;

      set({ settings, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to initialize settings:', err);
    }
  },

  updateSettings: async (newSettings: Settings) => {
    set({ isLoading: true, error: null });
    try {
      if (!db) throw new Error('Database not initialized');

      // Update each setting
      for (const [key, value] of Object.entries(newSettings)) {
        await db.execute(
          `INSERT INTO settings (key, value) 
           VALUES ($1, $2)
           ON CONFLICT(key) DO UPDATE SET 
           value = $2,
           updated_at = CURRENT_TIMESTAMP`,
          [key, value]
        );
      }

      // Update local state
      set(() => ({
        settings: newSettings,
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to update settings:', err);
    }
  },
}));
