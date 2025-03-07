import { CollectionComparison } from '../types/collection';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import AppDb from './AppDb';

const getCollectionComparisons = async (): Promise<CollectionComparison[]> => {
  if (deviceIdentifier.isWeb) {
    const collections = window.localStorage.getItem(`collectionComparison`);
    if (collections) {
      return JSON.parse(collections);
    }

    return [];
  }

  const result = await AppDb.select<CollectionComparison[]>(
    'SELECT * FROM collections ORDER BY handle ASC'
  );

  return result;
};

const getCollectionComparison = async (
  handle: string
): Promise<CollectionComparison | null> => {
  if (deviceIdentifier.isWeb) {
    const collections = await getCollectionComparisons();
    return collections.find((c) => c.handle === handle) ?? null;
  }

  const [result] = await AppDb.select<CollectionComparison[]>(
    'SELECT * FROM collections WHERE handle = $1',
    [handle]
  );

  return result;
};

const setCollectionComparison = async (collection: CollectionComparison) => {
  if (deviceIdentifier.isWeb) {
    const collections = await getCollectionComparisons();

    const collectionsToUpdate = [
      ...collections.filter((c) => c.handle !== collection.handle),
      collection,
    ].sort((a, b) => a.handle.localeCompare(b.handle));
    window.localStorage.setItem(
      'collectionComparison',
      JSON.stringify(collectionsToUpdate)
    );
    return;
  }

  await AppDb.execute(
    `INSERT INTO collections (
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
      collection.handle,
      collection.production_id,
      collection.staging_id,
      collection.title,
      collection.differences,
      collection.updated_at,
    ]
  );
};

export const collectionDb = {
  getCollectionComparisons,
  getCollectionComparison,
  setCollectionComparison,
  clearAllCollections: async () => {
    if (deviceIdentifier.isWeb) {
      window.localStorage.removeItem('collectionComparison');
      return;
    }

    await AppDb.execute('DELETE FROM collections');
  },
};
