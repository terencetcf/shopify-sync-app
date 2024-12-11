import Database from '@tauri-apps/plugin-sql';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import { ProductComparison } from '../stores/useProductsSyncStore';

export const productDb = {
  getProductComparisons: async (): Promise<ProductComparison[]> => {
    if (deviceIdentifier.isWeb) {
      const products = window.localStorage.getItem(`productComparison`);
      if (products) {
        return JSON.parse(products);
      }
      return [];
    }

    const db = await Database.load('sqlite:settings.db');
    const result = await db.select<ProductComparison[]>(
      'SELECT * FROM products ORDER BY handle ASC'
    );

    return result;
  },

  getProductComparison: async (
    handle: string
  ): Promise<ProductComparison | null> => {
    const products = await productDb.getProductComparisons();
    return products.find((p) => p.handle === handle) ?? null;
  },

  setProductComparison: async (product: ProductComparison) => {
    if (deviceIdentifier.isWeb) {
      const products = await productDb.getProductComparisons();
      const productsToUpdate = [
        ...products.filter((p) => p.handle !== product.handle),
        product,
      ].sort((a, b) => a.handle.localeCompare(b.handle));
      window.localStorage.setItem(
        'productComparison',
        JSON.stringify(productsToUpdate)
      );
      return;
    }

    const db = await Database.load('sqlite:settings.db');
    await db.execute(
      `INSERT INTO products (
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
        product.handle,
        product.production_id || null,
        product.staging_id || null,
        product.title,
        product.differences,
        product.updated_at,
      ]
    );
  },
};
