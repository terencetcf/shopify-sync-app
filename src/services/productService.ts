import { print } from 'graphql';
import { shopifyApi } from './shopify';
import { Environment } from '../types/environment';
import { logger } from '../utils/logger';
import { DetailedProduct, ShopifyProduct } from '../types/product';
import {
  PRODUCTS_QUERY,
  PRODUCT_DETAILS_QUERY,
  CREATE_PRODUCT_MUTATION,
  UPDATE_PRODUCT_MUTATION,
} from '../graphql/products';
import { productDb } from './productDb';
import { compareField, compareMetafields } from '../utils/compareUtils';

interface ProductResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface ProductUpdateResponse {
  productUpdate: {
    product: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export async function fetchAllProducts(
  environment: Environment
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response: ProductResponse = await shopifyApi.post<ProductResponse>(
        environment,
        {
          query: print(PRODUCTS_QUERY),
          variables: { cursor },
        }
      );

      products.push(
        ...response.products.edges.map(
          ({ node }: { node: ShopifyProduct }) => node
        )
      );
      hasNextPage = response.products.pageInfo.hasNextPage;
      cursor = response.products.pageInfo.endCursor;

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching products for ${environment}:`, err);
      throw err;
    }
  }

  return products;
}

export async function fetchProductDetails(
  environment: Environment,
  id: string
): Promise<DetailedProduct> {
  try {
    const response = await shopifyApi.post<{ product: DetailedProduct }>(
      environment,
      {
        query: print(PRODUCT_DETAILS_QUERY),
        variables: { id },
      }
    );
    return response.product;
  } catch (err) {
    logger.error(
      `Error fetching product details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

export async function compareProductDetails(
  productionProduct: DetailedProduct,
  stagingProduct: DetailedProduct
): Promise<string[]> {
  const differences: string[] = [];

  // Compare basic fields
  compareField(
    'Title',
    productionProduct.title,
    stagingProduct.title,
    differences
  );
  compareField(
    'Description',
    productionProduct.description,
    stagingProduct.description,
    differences
  );
  compareField(
    'Status',
    productionProduct.status,
    stagingProduct.status,
    differences
  );
  compareField(
    'Vendor',
    productionProduct.vendor.trim(),
    stagingProduct.vendor.trim(),
    differences
  );
  compareField(
    'Product Type',
    productionProduct.productType,
    stagingProduct.productType,
    differences
  );

  // Compare tags
  if (
    JSON.stringify(productionProduct.tags.sort()) !==
    JSON.stringify(stagingProduct.tags.sort())
  ) {
    differences.push('Tags');
    logger.info('Tags mismatch', productionProduct.tags, stagingProduct.tags);
  }

  // Compare metafields
  compareMetafields(
    productionProduct.metafields,
    stagingProduct.metafields,
    differences
  );

  return differences;
}

export async function syncProductToEnvironment(
  handle: string,
  sourceEnvironment: Environment,
  targetEnvironment: Environment
): Promise<void> {
  try {
    const sourceId =
      sourceEnvironment === 'production' ? 'production_id' : 'staging_id';
    const targetId =
      sourceEnvironment === 'production' ? 'staging_id' : 'production_id';

    const product = await productDb.getProductComparison(handle);

    if (!product || !product[sourceId]) {
      throw new Error(`Product ${handle} not found in ${sourceEnvironment}`);
    }

    const sourceDetails = await fetchProductDetails(
      sourceEnvironment,
      product[sourceId]
    );

    const input = {
      title: sourceDetails.title,
      handle: sourceDetails.handle,
      descriptionHtml: sourceDetails.descriptionHtml,
      vendor: sourceDetails.vendor,
      productType: sourceDetails.productType,
      status: sourceDetails.status,
      tags: sourceDetails.tags,
      category: sourceDetails.category,
      templateSuffix: sourceDetails.templateSuffix,
      metafields: sourceDetails.metafields.edges.map((edge) => ({
        namespace: edge.node.namespace,
        key: edge.node.key,
        value: edge.node.value,
        type: edge.node.type,
      })),
      giftCardTemplateSuffix: sourceDetails.giftCardTemplateSuffix,
      requiresSellingPlan: sourceDetails.requiresSellingPlan,
      seo: sourceDetails.seo,
    };

    if (product[targetId]) {
      const response = await shopifyApi.post<ProductUpdateResponse>(
        targetEnvironment,
        {
          query: print(UPDATE_PRODUCT_MUTATION),
          variables: {
            input: {
              id: product[targetId],
              ...input,
            },
            media: [], // TODO: temporary disabled for trial account
          },
        }
      );

      if (response.productUpdate.userErrors?.length > 0) {
        throw new Error(response.productUpdate.userErrors[0].message);
      }
    } else {
      const response = await shopifyApi.post<ProductCreateResponse>(
        targetEnvironment,
        {
          query: print(CREATE_PRODUCT_MUTATION),
          variables: {
            input,
            media: [], // TODO: temporary disabled for trial account
          },
        }
      );

      if (response.productCreate.userErrors?.length > 0) {
        throw new Error(response.productCreate.userErrors[0].message);
      }
    }
  } catch (err) {
    logger.error(
      `Failed to sync product ${handle} to ${targetEnvironment}:`,
      err
    );
    throw err;
  }
}
