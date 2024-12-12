import { create } from 'zustand';
import { Environment } from '../types/environment';
import { ProductsSyncStore } from '../types/product';
import {
  fetchAllProducts,
  compareProductDetails,
  syncProductToEnvironment,
  fetchProductDetails,
} from '../services/productService';
import { logger } from '../utils/logger';
import { productDb } from '../services/productDb';

export const useProductsSyncStore = create<ProductsSyncStore>((set, get) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,
  syncProgress: null,
  compareProgress: null,

  fetchStoredProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const products = await productDb.getProductComparisons();
      set({ products, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to fetch stored products:', err);
    }
  },

  compareProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      logger.info('Starting product comparison...');
      const [productionProducts, stagingProducts] = await Promise.all([
        fetchAllProducts('production'),
        fetchAllProducts('staging'),
      ]);

      const productionMap = new Map(
        productionProducts.map((p) => [p.handle, p])
      );
      const stagingMap = new Map(stagingProducts.map((p) => [p.handle, p]));

      const allHandles = new Set([
        ...productionMap.keys(),
        ...stagingMap.keys(),
      ]);

      logger.info(`Total unique handles found: ${allHandles.size}`);

      // Initialize progress
      set({ compareProgress: { current: 0, total: allHandles.size } });
      let processed = 0;

      for (const handle of allHandles) {
        const productionProduct = productionMap.get(handle);
        const stagingProduct = stagingMap.get(handle);

        let differences: string[] = [];

        if (!productionProduct) {
          differences = ['Missing in production'];
        } else if (!stagingProduct) {
          differences = ['Missing in staging'];
        } else if (productionProduct.updatedAt !== stagingProduct.updatedAt) {
          const [productionDetails, stagingDetails] = await Promise.all([
            fetchProductDetails('production', productionProduct.id),
            fetchProductDetails('staging', stagingProduct.id),
          ]);

          differences = await compareProductDetails(
            productionDetails,
            stagingDetails
          );
        } else {
          differences = ['In sync'];
        }

        await productDb.setProductComparison({
          handle,
          production_id: productionProduct?.id ?? null,
          staging_id: stagingProduct?.id ?? null,
          title: (productionProduct || stagingProduct)?.title ?? '',
          differences: differences.join(', ') || 'In sync',
          updated_at: (productionProduct || stagingProduct)!.updatedAt,
          compared_at: new Date().toISOString(),
        });

        // Update progress
        processed++;
        set({
          compareProgress: { current: processed, total: allHandles.size },
        });
      }

      await get().fetchStoredProducts();
      logger.info('Product comparison completed successfully');
      set({ isLoading: false, compareProgress: null });
    } catch (err: any) {
      set({ error: err.message, isLoading: false, compareProgress: null });
      logger.error('Failed to compare products:', err);
    }
  },

  syncProducts: async (handles: string[], targetEnvironment: Environment) => {
    set({
      isLoading: true,
      error: null,
      syncProgress: { current: 0, total: handles.length },
    });

    try {
      const sourceEnvironment =
        targetEnvironment === 'production' ? 'staging' : 'production';

      // Process products in chunks to avoid overwhelming the API
      const chunkSize = 2;
      for (let i = 0; i < handles.length; i += chunkSize) {
        const chunk = handles.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (handle) => {
            try {
              await syncProductToEnvironment(
                handle,
                sourceEnvironment,
                targetEnvironment
              );

              // Update the product in state and database
              const product = await productDb.getProductComparison(handle);
              if (product) {
                await productDb.setProductComparison({
                  ...product,
                  differences: 'In sync',
                  compared_at: new Date().toISOString(),
                });

                set((state) => ({
                  products: state.products.map((p) =>
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
                `Failed to sync product ${handle} to ${targetEnvironment}:`,
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
        `Successfully synced ${handles.length} products to ${targetEnvironment}`
      );
    } catch (err: any) {
      set({ error: err.message, isLoading: false, syncProgress: null });
      logger.error('Failed to sync products:', err);
      throw err;
    }
  },

  fetchProductDetails: async (id: string, environment: Environment) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const product = await fetchProductDetails(environment, id);
      set({
        selectedProduct: product,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch product details';
      set({ error: errorMessage, isLoadingDetails: false });
      logger.error('Error fetching product details:', err);
    }
  },
}));
