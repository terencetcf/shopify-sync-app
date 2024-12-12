import { create } from 'zustand';
import { Environment } from '../types/environment';
import { PagesSyncStore } from '../types/page';
import {
  fetchAllPages,
  comparePageDetails,
  syncPageToEnvironment,
  fetchPageDetails,
} from '../services/pageService';
import { logger } from '../utils/logger';
import { pageDb } from '../services/pageDb';

export const usePagesSyncStore = create<PagesSyncStore>((set, get) => ({
  pages: [],
  selectedPage: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  syncProgress: null,
  compareProgress: null,

  fetchStoredPages: async () => {
    set({ isLoading: true, error: null });
    try {
      const pages = await pageDb.getPageComparisons();
      set({ pages, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to fetch stored pages:', err);
    }
  },

  comparePages: async () => {
    set({ isLoading: true, error: null });
    try {
      logger.info('Starting page comparison...');
      const [productionPages, stagingPages] = await Promise.all([
        fetchAllPages('production'),
        fetchAllPages('staging'),
      ]);

      const productionMap = new Map(productionPages.map((p) => [p.handle, p]));
      const stagingMap = new Map(stagingPages.map((p) => [p.handle, p]));

      const allHandles = new Set([
        ...productionMap.keys(),
        ...stagingMap.keys(),
      ]);

      logger.info(`Total unique handles found: ${allHandles.size}`);

      // Initialize progress
      set({ compareProgress: { current: 0, total: allHandles.size } });
      let processed = 0;

      for (const handle of allHandles) {
        const productionPage = productionMap.get(handle);
        const stagingPage = stagingMap.get(handle);

        let differences: string[] = [];

        if (!productionPage) {
          differences = ['Missing in production'];
        } else if (!stagingPage) {
          differences = ['Missing in staging'];
        } else if (productionPage.updatedAt !== stagingPage.updatedAt) {
          const [productionDetails, stagingDetails] = await Promise.all([
            fetchPageDetails('production', productionPage.id),
            fetchPageDetails('staging', stagingPage.id),
          ]);

          differences = await comparePageDetails(
            productionDetails,
            stagingDetails
          );
        } else {
          differences = ['In sync'];
        }

        await pageDb.setPageComparison({
          handle,
          production_id: productionPage?.id ?? null,
          staging_id: stagingPage?.id ?? null,
          title: (productionPage || stagingPage)?.title ?? '',
          differences: differences.join(', ') || 'In sync',
          updated_at: (productionPage || stagingPage)!.updatedAt,
          compared_at: new Date().toISOString(),
        });

        // Update progress
        processed++;
        set({
          compareProgress: { current: processed, total: allHandles.size },
        });
      }

      await get().fetchStoredPages();
      logger.info('Page comparison completed successfully');
      set({ isLoading: false, compareProgress: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, compareProgress: null });
      logger.error('Failed to compare pages:', err);
    }
  },

  syncPages: async (handles: string[], targetEnvironment: Environment) => {
    set({
      isLoading: true,
      error: null,
      syncProgress: { current: 0, total: handles.length },
    });

    try {
      const sourceEnvironment =
        targetEnvironment === 'production' ? 'staging' : 'production';

      // Process pages in chunks to avoid overwhelming the API
      const chunkSize = 2;
      for (let i = 0; i < handles.length; i += chunkSize) {
        const chunk = handles.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (handle) => {
            try {
              await syncPageToEnvironment(
                handle,
                sourceEnvironment,
                targetEnvironment
              );

              // Update the page in state and database
              const page = await pageDb.getPageComparison(handle);
              if (page) {
                await pageDb.setPageComparison({
                  ...page,
                  differences: 'In sync',
                  compared_at: new Date().toISOString(),
                });

                set((state) => ({
                  pages: state.pages.map((p) =>
                    p.handle === handle
                      ? {
                          ...p,
                          differences: 'In sync',
                          compared_at: new Date().toISOString(),
                        }
                      : p
                  ),
                }));
              }
            } catch (err) {
              logger.error(
                `Failed to sync page ${handle} to ${targetEnvironment}:`,
                err
              );
              throw err;
            }
          })
        );

        set((state) => ({
          ...state,
          syncProgress: {
            current: Math.min(i + chunkSize, handles.length),
            total: handles.length,
          },
        }));
      }

      set((state) => ({ ...state, isLoading: false, syncProgress: null }));
      logger.info(
        `Successfully synced ${handles.length} pages to ${targetEnvironment}`
      );
    } catch (err: any) {
      set({ error: err.message, isLoading: false, syncProgress: null });
      logger.error('Failed to sync pages:', err);
      throw err;
    }
  },

  fetchPageDetails: async (id: string, environment: Environment) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const page = await fetchPageDetails(environment, id);
      set({
        selectedPage: page,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch page details';
      set({ error: errorMessage, isLoadingDetails: false });
      logger.error('Error fetching page details:', err);
    }
  },
}));
