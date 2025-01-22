import { create } from 'zustand';
import { Environment } from '../types/environment';
import { CollectionsSyncStore } from '../types/collection';
import {
  fetchAllCollections,
  compareCollectionDetails,
  syncCollectionToEnvironment,
  fetchCollectionDetails,
} from '../services/collectionService';
import { logger } from '../utils/logger';
import { collectionDb } from '../services/collectionDb';

export const useCollectionsSyncStore = create<CollectionsSyncStore>(
  (set, get) => ({
    collections: [],
    selectedCollection: null,
    isLoading: false,
    isLoadingDetails: false,
    error: null,
    syncProgress: null,
    compareProgress: null,

    fetchStoredCollections: async () => {
      set({ isLoading: true, error: null });
      try {
        const collections = await collectionDb.getCollectionComparisons();
        set({ collections, isLoading: false });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
        logger.error('Failed to fetch stored collections:', err);
        throw err;
      }
    },

    compareCollections: async () => {
      set({ isLoading: true, error: null });
      try {
        logger.info('Starting collection comparison...');
        set({ compareProgress: { current: 0, total: 1 } });

        // Clear existing collections before starting new comparison
        await collectionDb.clearAllCollections();

        const [productionCollections, stagingCollections] = await Promise.all([
          fetchAllCollections('production'),
          fetchAllCollections('staging'),
        ]);

        const productionMap = new Map(
          productionCollections.map((c) => [c.handle, c])
        );
        const stagingMap = new Map(
          stagingCollections.map((c) => [c.handle, c])
        );

        const allHandles = new Set([
          ...productionMap.keys(),
          ...stagingMap.keys(),
        ]);

        logger.info(`Total unique handles found: ${allHandles.size}`);

        // Initialize progress
        let processed = 0;

        for (const handle of allHandles) {
          const productionCollection = productionMap.get(handle);
          const stagingCollection = stagingMap.get(handle);

          let differences: string[] = [];

          if (!productionCollection) {
            differences = ['Missing in production'];
          } else if (!stagingCollection) {
            differences = ['Missing in staging'];
          } else if (
            productionCollection.updatedAt !== stagingCollection.updatedAt
          ) {
            const [productionDetails, stagingDetails] = await Promise.all([
              fetchCollectionDetails('production', productionCollection.id),
              fetchCollectionDetails('staging', stagingCollection.id),
            ]);

            differences = await compareCollectionDetails(
              productionDetails,
              stagingDetails
            );
          } else {
            differences = ['In sync'];
          }

          await collectionDb.setCollectionComparison({
            handle,
            production_id: productionCollection?.id ?? null,
            staging_id: stagingCollection?.id ?? null,
            title: (productionCollection || stagingCollection)?.title ?? '',
            differences: differences.join(', ') || 'In sync',
            updated_at: (productionCollection || stagingCollection)!.updatedAt,
            compared_at: new Date().toISOString(),
          });

          // Update progress
          processed++;
          set({
            compareProgress: { current: processed, total: allHandles.size },
          });
        }

        await get().fetchStoredCollections();
        logger.info('Collection comparison completed successfully');
        set({ isLoading: false, compareProgress: null });
      } catch (err: any) {
        set({ error: err.message, isLoading: false, compareProgress: null });
        logger.error('Failed to compare collections:', err);
        throw err;
      }
    },

    syncCollections: async (
      handles: string[],
      targetEnvironment: Environment
    ) => {
      set({
        isLoading: true,
        error: null,
        syncProgress: { current: 0, total: handles.length },
      });

      try {
        const sourceEnvironment =
          targetEnvironment === 'production' ? 'staging' : 'production';

        // Process collections in chunks to avoid overwhelming the API
        const chunkSize = 2;
        for (let i = 0; i < handles.length; i += chunkSize) {
          const chunk = handles.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (handle) => {
              try {
                await syncCollectionToEnvironment(
                  handle,
                  sourceEnvironment,
                  targetEnvironment
                );

                // Update the collection in state and database
                const collection = await collectionDb.getCollectionComparison(
                  handle
                );
                if (collection) {
                  await collectionDb.setCollectionComparison({
                    ...collection,
                    differences: 'In sync',
                    compared_at: new Date().toISOString(),
                  });

                  set((state) => ({
                    collections: state.collections.map((c) =>
                      c.handle === handle
                        ? {
                            ...c,
                            differences: 'In sync',
                            compared_at: new Date().toISOString(),
                          }
                        : c
                    ),
                  }));
                }
              } catch (err) {
                logger.error(
                  `Failed to sync collection ${handle} to ${targetEnvironment}:`,
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
          `Successfully synced ${handles.length} collections to ${targetEnvironment}`
        );
      } catch (err: any) {
        set({ error: err.message, isLoading: false, syncProgress: null });
        logger.error('Failed to sync collections:', err);
        throw err;
      }
    },

    fetchCollectionDetails: async (id: string, environment: Environment) => {
      set({ isLoadingDetails: true, error: null });
      try {
        const collection = await fetchCollectionDetails(environment, id);
        set({
          selectedCollection: collection,
          isLoadingDetails: false,
        });
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.errors?.[0]?.message ||
          'Failed to fetch collection details';
        set({ error: errorMessage, isLoadingDetails: false });
        logger.error('Error fetching collection details:', err);
        throw err;
      }
    },
  })
);
