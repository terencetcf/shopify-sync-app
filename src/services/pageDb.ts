import { PageComparison } from '../types/page';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import AppDb from './AppDb';

export const pageDb = {
  getPageComparisons: async (): Promise<PageComparison[]> => {
    if (deviceIdentifier.isWeb) {
      const pages = window.localStorage.getItem(`pageComparison`);
      if (pages) {
        return JSON.parse(pages);
      }
      return [];
    }

    const result = await AppDb.select<PageComparison[]>(
      'SELECT * FROM pages ORDER BY handle ASC'
    );

    return result;
  },

  getPageComparison: async (handle: string): Promise<PageComparison | null> => {
    if (deviceIdentifier.isWeb) {
      const pages = await pageDb.getPageComparisons();
      return pages.find((p) => p.handle === handle) ?? null;
    }

    const [result] = await AppDb.select<PageComparison[]>(
      'SELECT * FROM pages WHERE handle = $1',
      [handle]
    );

    return result;
  },

  setPageComparison: async (page: PageComparison) => {
    if (deviceIdentifier.isWeb) {
      const pages = await pageDb.getPageComparisons();
      const pagesToUpdate = [
        ...pages.filter((p) => p.handle !== page.handle),
        page,
      ].sort((a, b) => a.handle.localeCompare(b.handle));
      window.localStorage.setItem(
        'pageComparison',
        JSON.stringify(pagesToUpdate)
      );
      return;
    }

    await AppDb.execute(
      `INSERT INTO pages (
        handle,
        production_id,
        staging_id,
        title,
        differences,
        updated_at,
        compared_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT(handle) DO UPDATE SET
        production_id = $2,
        staging_id = $3,
        title = $4,
        differences = $5,
        updated_at = $6,
        compared_at = CURRENT_TIMESTAMP`,
      [
        page.handle,
        page.production_id ?? null,
        page.staging_id ?? null,
        page.title,
        page.differences,
        page.updated_at,
      ]
    );
  },

  clearAllPages: async () => {
    if (deviceIdentifier.isWeb) {
      window.localStorage.removeItem('pageComparison');
      return;
    }

    await AppDb.execute('DELETE FROM pages');
  },
};
