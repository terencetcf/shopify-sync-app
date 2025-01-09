import { ProductComparison } from '../types/product';
import { deviceIdentifier } from '../utils/deviceIdentifier';
import AppDb from './AppDb';

export const productDb = {
  getProductComparisons: async (): Promise<ProductComparison[]> => {
    if (deviceIdentifier.isWeb) {
      const products = window.localStorage.getItem(`productComparison`);
      if (products) {
        return JSON.parse(products);
      }
      return [];
    }

    const result = await AppDb.select<ProductComparison[]>(
      'SELECT * FROM products ORDER BY handle ASC'
    );

    return result;
  },

  getProductComparison: async (
    handle: string
  ): Promise<ProductComparison | null> => {
    if (deviceIdentifier.isWeb) {
      const products = await productDb.getProductComparisons();
      return products.find((p) => p.handle === handle) ?? null;
    }

    const [result] = await AppDb.select<ProductComparison[]>(
      'SELECT * FROM products WHERE handle = $1',
      [handle]
    );

    return result;
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

    await AppDb.execute(
      `INSERT INTO products (
        handle,
        production_id,
        staging_id,
        title,
        differences,
        updated_at,
        compared_at,
        collections
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
      ON CONFLICT(handle) DO UPDATE SET
        production_id = $2,
        staging_id = $3,
        title = $4,
        differences = $5,
        updated_at = $6,
        compared_at = CURRENT_TIMESTAMP,
        collections = $7`,
      [
        product.handle,
        product.production_id || null,
        product.staging_id || null,
        product.title,
        product.differences,
        product.updated_at,
        product.collections || '',
      ]
    );
  },
};
