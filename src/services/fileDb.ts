import { FileComparison } from '../types/file';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import AppDb from './AppDb';

export const fileDb = {
  getFileComparisons: async (): Promise<FileComparison[]> => {
    if (deviceIdentifier.isWeb) {
      const files = window.localStorage.getItem(`fileComparison`);
      if (files) {
        return JSON.parse(files);
      }
      return [];
    }

    const result = await AppDb.select<FileComparison[]>(
      'SELECT * FROM files ORDER BY id ASC'
    );

    return result;
  },

  getFileComparison: async (id: string): Promise<FileComparison | null> => {
    if (deviceIdentifier.isWeb) {
      const files = await fileDb.getFileComparisons();
      return files.find((f) => f.id === id) ?? null;
    }

    const [result] = await AppDb.select<FileComparison[]>(
      'SELECT * FROM files WHERE id = $1',
      [id]
    );

    return result;
  },

  setFileComparison: async (file: FileComparison) => {
    if (deviceIdentifier.isWeb) {
      const files = await fileDb.getFileComparisons();
      const filesToUpdate = [
        ...files.filter((f) => f.id !== file.id),
        file,
      ].sort((a, b) => a.id.localeCompare(b.id));
      window.localStorage.setItem(
        'fileComparison',
        JSON.stringify(filesToUpdate)
      );
      return;
    }

    await AppDb.execute(
      `INSERT INTO files (
        id,
        production_id,
        staging_id,
        alt,
        url,
        differences,
        updated_at,
        compared_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        production_id = $2,
        staging_id = $3,
        alt = $4,
        url = $5,
        differences = $6,
        updated_at = $7,
        compared_at = CURRENT_TIMESTAMP`,
      [
        file.id,
        file.production_id || null,
        file.staging_id || null,
        file.alt,
        file.url,
        file.differences,
        file.updated_at,
      ]
    );
  },

  clearAllFiles: async () => {
    if (deviceIdentifier.isWeb) {
      window.localStorage.removeItem('fileComparison');
      return;
    }

    await AppDb.execute('DELETE FROM files');
  },
};
