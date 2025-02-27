import { create } from 'zustand';
import { Environment } from '../types/environment';
import { FilesSyncStore } from '../types/file';
import {
  fetchAllFiles,
  compareFileDetails,
  syncFileToEnvironment,
} from '../services/fileService';
import { logger } from '../utils/logger';
import { fileDb } from '../services/fileDb';
import { extractFileName } from '../utils/fileUtils';

export const useFilesSyncStore = create<FilesSyncStore>((set, get) => ({
  files: [],
  selectedFile: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  syncProgress: null,
  compareProgress: null,

  fetchStoredFiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const files = await fileDb.getFileComparisons();
      // Sort files by filename
      const sortedFiles = files.sort((a, b) => {
        const fileNameA = extractFileName(a.url).toLowerCase();
        const fileNameB = extractFileName(b.url).toLowerCase();
        return fileNameA.localeCompare(fileNameB);
      });
      set({ files: sortedFiles, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to fetch stored files:', err);
      throw err;
    }
  },

  compareFiles: async () => {
    set({ isLoading: true, error: null });
    try {
      logger.info('Starting file comparison...');
      set({ compareProgress: { current: 0, total: 1 } });

      const [productionFiles, stagingFiles] = await Promise.all([
        fetchAllFiles('production'),
        fetchAllFiles('staging'),
      ]);

      // Create maps using filename as the key instead of ID
      const productionMap = new Map(
        productionFiles.map((f) => [extractFileName(f.preview.image.url), f])
      );
      const stagingMap = new Map(
        stagingFiles.map((f) => [extractFileName(f.preview.image.url), f])
      );

      // Get unique filenames
      const allFileNames = new Set([
        ...productionMap.keys(),
        ...stagingMap.keys(),
      ]);

      logger.info(`Total unique files found: ${allFileNames.size}`);

      // Initialize progress
      set({ compareProgress: { current: 0, total: allFileNames.size } });
      await fileDb.clearAllFiles();
      let processed = 0;

      for (const fileName of allFileNames) {
        const productionFile = productionMap.get(fileName);
        const stagingFile = stagingMap.get(fileName);

        let differences: string[] = [];

        if (!productionFile) {
          differences = ['Missing in production'];
        } else if (!stagingFile) {
          differences = ['Missing in staging'];
        } else {
          differences = await compareFileDetails(productionFile, stagingFile);
          if (differences.length === 0) {
            differences = ['In sync'];
          }
        }

        await fileDb.setFileComparison({
          id: fileName, // Use filename as ID
          production_id: productionFile?.id ?? null,
          staging_id: stagingFile?.id ?? null,
          alt: (productionFile || stagingFile)?.alt ?? '',
          url: (productionFile || stagingFile)?.preview.image.url ?? '',
          differences: differences.join(', '),
          updated_at: new Date().toISOString(),
          compared_at: new Date().toISOString(),
        });

        // Update progress
        processed++;

        set({
          compareProgress: { current: processed, total: allFileNames.size },
        });
      }

      await get().fetchStoredFiles();
      logger.info('File comparison completed successfully');
      set({ isLoading: false, compareProgress: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, compareProgress: null });
      logger.error('Failed to compare files:', err);
      throw err;
    }
  },

  syncFiles: async (ids: string[], targetEnvironment: Environment) => {
    set({
      isLoading: true,
      error: null,
      syncProgress: { current: 0, total: ids.length },
    });

    try {
      const sourceEnvironment =
        targetEnvironment === 'production' ? 'staging' : 'production';

      // Process files in chunks to avoid overwhelming the API
      const chunkSize = 2;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              const createdId = await syncFileToEnvironment(
                id,
                sourceEnvironment,
                targetEnvironment
              );
              const targetFieldToUpdate =
                targetEnvironment === 'production'
                  ? 'production_id'
                  : 'staging_id';

              // Update the file in state and database
              const file = await fileDb.getFileComparison(id);
              if (file) {
                await fileDb.setFileComparison({
                  ...file,
                  [targetFieldToUpdate]: createdId,
                  differences: 'In sync',
                  compared_at: new Date().toISOString(),
                });

                set((state) => ({
                  files: state.files.map((f) =>
                    f.id === id
                      ? {
                          ...f,
                          [targetFieldToUpdate]: createdId,
                          differences: 'In sync',
                          compared_at: new Date().toISOString(),
                        }
                      : f
                  ),
                }));
              }
            } catch (err) {
              logger.error(
                `Failed to sync file ${id} to ${targetEnvironment}:`,
                err
              );
              throw err;
            }
          })
        );

        set(() => ({
          syncProgress: {
            current: Math.min(i + chunkSize, ids.length),
            total: ids.length,
          },
        }));
      }

      set({ isLoading: false, syncProgress: null });
      logger.info(
        `Successfully synced ${ids.length} files to ${targetEnvironment}`
      );
    } catch (err: any) {
      set({ error: err.message, isLoading: false, syncProgress: null });
      logger.error('Failed to sync files:', err);
      throw err;
    }
  },

  fetchFileDetails: async (id: string, environment: Environment) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const files = await fetchAllFiles(environment);
      const file = files.find((f) => f.id === id);
      if (!file) {
        throw new Error('File not found');
      }
      set({
        selectedFile: file,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch file details';
      set({ error: errorMessage, isLoadingDetails: false });
      logger.error('Error fetching file details:', err);
      throw err;
    }
  },
}));
