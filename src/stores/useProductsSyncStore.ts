import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { logger } from '../utils/logger';
import { Environment } from '../types/sync';
import { productDb } from '../services/productDb';

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface ProductComparison {
  id: string;
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedProduct {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  description: string;
  descriptionHtml: string;
  status: string;
  vendor: string;
  productType: string;
  tags: string[];
  isGiftCard: boolean;
  giftCardTemplateSuffix?: string;
  templateSuffix?: string;
  requiresSellingPlan: boolean;
  combinedListingRole?: string;
  category?: {
    name: string;
  };
  seo?: {
    title: string;
    description: string;
  };
  options?: Array<{
    name: string;
    position: number;
    values: string[];
    linkedMetafield?: {
      namespace: string;
      key: string;
    };
  }>;
  media?: {
    edges: Array<{
      node: {
        mediaContentType: string;
        status: string;
        preview?: {
          image?: {
            url: string;
            altText: string;
          };
        };
      };
    }>;
  };
  collections: {
    edges: Array<{
      node: {
        handle: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku: string;
        price: string;
        compareAtPrice: string | null;
        inventoryQuantity: number;
      };
    }>;
  };
  metafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
        type: string;
      };
    }>;
  };
}

interface ProductsSyncStore {
  products: ProductComparison[];
  selectedProduct: DetailedProduct | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  fetchStoredProducts: () => Promise<void>;
  compareProducts: () => Promise<void>;
  syncProducts: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchProductDetails: (id: string, environment: Environment) => Promise<void>;
}

const PRODUCTS_QUERY = `
  query GetProducts($cursor: String) {
    products(first: 250, after: $cursor) {
      edges {
        node {
          id
          handle
          title
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const PRODUCT_DETAILS_QUERY = `
  query GetProductDetails($id: ID!) {
    product(id: $id) {
      id
      handle
      title
      updatedAt
      description
      descriptionHtml
      status
      vendor
      productType
      tags
      isGiftCard
      giftCardTemplateSuffix
      templateSuffix
      requiresSellingPlan
      combinedListingRole
      category {
        name
      }
      seo {
        title
        description
      }
      options {
        name
        position
        values
        linkedMetafield {
          namespace
          key
        }
      }
      media(first: 20) {
        edges {
          node {
            mediaContentType
            status
            preview {
              image {
                url
                altText
              }
            }
          }
        }
      }
      collections(first: 20) {
        edges {
          node {
            handle
          }
        }
      }
      variants(first: 250) {
        edges {
          node {
            id
            title
            sku
            price
            compareAtPrice
            inventoryQuantity
          }
        }
      }
      metafields(first: 100) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        code
        field
        message
      }
    }
  }
`;

// Helper functions
async function fetchAllProducts(
  environment: Environment
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      logger.info(
        `Fetching products for ${environment} with cursor: ${cursor}`
      );

      interface ProductsResponse {
        products: {
          edges: Array<{ node: ShopifyProduct }>;
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      }

      const response: ProductsResponse =
        await shopifyApi.post<ProductsResponse>(environment, {
          query: PRODUCTS_QUERY,
          variables: { cursor },
        });

      const {
        edges,
        pageInfo: { hasNextPage: nextPage, endCursor },
      } = response.products;

      const newProducts = edges.map(({ node }) => node);
      products.push(...newProducts);

      logger.info(`Fetched ${newProducts.length} products for ${environment}`);
      hasNextPage = nextPage;
      cursor = endCursor;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching products for ${environment}:`, err);
      throw err;
    }
  }

  logger.info(`Total products fetched for ${environment}: ${products.length}`);
  return products;
}

async function fetchProductDetails(
  environment: Environment,
  id: string
): Promise<DetailedProduct> {
  try {
    const response = await shopifyApi.post<{
      product: DetailedProduct;
    }>(environment, {
      query: PRODUCT_DETAILS_QUERY,
      variables: { id },
    });
    return response.product;
  } catch (err) {
    logger.error(
      `Error fetching product details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

async function compareProductDetails(
  productionProduct: DetailedProduct,
  stagingProduct: DetailedProduct
): Promise<string[]> {
  const differences: string[] = [];

  // Compare basic fields
  if (productionProduct.title !== stagingProduct.title)
    differences.push('Title');
  if (productionProduct.description !== stagingProduct.description)
    differences.push('Description');
  if (productionProduct.status !== stagingProduct.status)
    differences.push('Status');
  if (productionProduct.vendor !== stagingProduct.vendor)
    differences.push('Vendor');
  if (productionProduct.productType !== stagingProduct.productType)
    differences.push('Product Type');

  // Compare tags
  if (
    JSON.stringify(productionProduct.tags.sort()) !==
    JSON.stringify(stagingProduct.tags.sort())
  ) {
    differences.push('Tags');
  }

  // Compare variants
  const productionVariants = new Map(
    productionProduct.variants.edges.map(({ node }) => [node.sku, node])
  );
  const stagingVariants = new Map(
    stagingProduct.variants.edges.map(({ node }) => [node.sku, node])
  );

  if (productionVariants.size !== stagingVariants.size) {
    differences.push('Variants Count');
  } else {
    for (const [sku, prodVariant] of productionVariants) {
      const stageVariant = stagingVariants.get(sku);
      if (!stageVariant) {
        differences.push('Variants');
        break;
      }
      if (
        prodVariant.price !== stageVariant.price ||
        prodVariant.compareAtPrice !== stageVariant.compareAtPrice ||
        prodVariant.inventoryQuantity !== stageVariant.inventoryQuantity
      ) {
        differences.push('Variant Details');
        break;
      }
    }
  }

  // Compare metafields
  const productionMetafields = new Map(
    productionProduct.metafields.edges.map(({ node }) => [
      `${node.namespace}:${node.key}`,
      node.value,
    ])
  );
  const stagingMetafields = new Map(
    stagingProduct.metafields.edges.map(({ node }) => [
      `${node.namespace}:${node.key}`,
      node.value,
    ])
  );

  if (productionMetafields.size !== stagingMetafields.size) {
    differences.push('Metafields Count');
  } else {
    for (const [key, value] of productionMetafields) {
      if (stagingMetafields.get(key) !== value) {
        differences.push('Metafields Content');
        break;
      }
    }
  }

  return differences;
}

// Store implementation
export const useProductsSyncStore = create<ProductsSyncStore>((set, get) => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,

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

      for (const handle of allHandles) {
        const productionProduct = productionMap.get(handle);
        const stagingProduct = stagingMap.get(handle);

        let differences: string[] = [];

        if (!productionProduct) {
          differences = ['Missing in production'];
        } else if (!stagingProduct) {
          differences = ['Missing in staging'];
        } else if (productionProduct.updatedAt !== stagingProduct.updatedAt) {
          // Fetch and compare detailed product data
          logger.info(`Detailed comparison needed for ${handle}`);
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
          id: '',
          handle,
          production_id: productionProduct?.id ?? null,
          staging_id: stagingProduct?.id ?? null,
          title: (productionProduct || stagingProduct)?.title ?? '',
          differences: differences.join(', ') || 'In sync',
          updated_at: (productionProduct || stagingProduct)!.updatedAt,
          compared_at: new Date().toISOString(),
        });
      }

      await get().fetchStoredProducts();
      logger.info('Product comparison completed successfully');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to compare products:', err);
    }
  },

  syncProducts: async (handles: string[], targetEnvironment: Environment) => {
    set({ isLoading: true, error: null });
    try {
      const sourceEnvironment =
        targetEnvironment === 'production' ? 'staging' : 'production';
      const sourceIdField =
        sourceEnvironment === 'production' ? 'production_id' : 'staging_id';
      const targetIdField =
        targetEnvironment === 'production' ? 'production_id' : 'staging_id';

      for (const handle of handles) {
        // Sync the product
        const product = await productDb.getProductComparison(handle);
        if (!product || !product[sourceIdField]) {
          throw new Error(
            `Product ${handle} not found in ${sourceEnvironment}`
          );
        }

        // Fetch source product details
        const sourceDetails = await fetchProductDetails(
          sourceEnvironment,
          product[sourceIdField]!
        );

        // Prepare mutation input
        const input = {
          title: sourceDetails.title,
          handle: sourceDetails.handle,
          descriptionHtml: sourceDetails.descriptionHtml,
          vendor: sourceDetails.vendor,
          productType: sourceDetails.productType,
          status: sourceDetails.status,
          tags: sourceDetails.tags,
          variants: sourceDetails.variants.edges.map(({ node }) => ({
            sku: node.sku,
            price: node.price,
            compareAtPrice: node.compareAtPrice,
            inventoryQuantity: node.inventoryQuantity,
          })),
          metafields: sourceDetails.metafields.edges.map(({ node }) => ({
            namespace: node.namespace,
            key: node.key,
            value: node.value,
            type: node.type,
          })),
        };

        if (product[targetIdField]) {
          // Update existing product
          await shopifyApi.post(targetEnvironment, {
            query: UPDATE_PRODUCT_MUTATION,
            variables: {
              input: {
                id: product[targetIdField],
                ...input,
              },
            },
          });
        } else {
          // Create new product
          await shopifyApi.post(targetEnvironment, {
            query: CREATE_PRODUCT_MUTATION,
            variables: {
              input,
            },
          });
        }

        // Update database and state
        await productDb.setProductComparison({
          ...product,
          [targetIdField]: product[sourceIdField],
          differences: 'In sync',
          compared_at: new Date().toISOString(),
        });

        set((state) => ({
          products: state.products.map((p) =>
            p.handle === handle
              ? {
                  ...p,
                  [targetIdField]: p[sourceIdField],
                  differences: 'In sync',
                  compared_at: new Date().toISOString(),
                }
              : p
          ),
        }));
      }

      set({ isLoading: false });
      logger.info(
        `Successfully synced ${handles.length} products to ${targetEnvironment}`
      );
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to sync products:', err);
      throw err;
    }
  },

  fetchProductDetails: async (id: string, environment: Environment) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await shopifyApi.post<{
        product: DetailedProduct;
      }>(environment, {
        query: PRODUCT_DETAILS_QUERY,
        variables: { id },
      });
      set({
        selectedProduct: response.product,
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
