import { print } from 'graphql';
import { shopifyApi } from './shopify';
import { Environment } from '../types/environment';
import { logger } from '../utils/logger';
import { DetailedPage, ShopifyPage } from '../types/page';
import {
  PAGES_QUERY,
  PAGE_DETAILS_QUERY,
  CREATE_PAGE_MUTATION,
  UPDATE_PAGE_MUTATION,
} from '../graphql/pages';
import { pageDb } from './pageDb';

interface PageResponse {
  pages: {
    edges: Array<{
      node: ShopifyPage;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface PageUpdateResponse {
  pageUpdate: {
    page: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

interface PageCreateResponse {
  pageCreate: {
    page: {
      id: string;
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export async function fetchAllPages(
  environment: Environment
): Promise<ShopifyPage[]> {
  const pages: ShopifyPage[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response: PageResponse = await shopifyApi.post<PageResponse>(
        environment,
        {
          query: print(PAGES_QUERY),
          variables: { cursor },
        }
      );

      pages.push(...response.pages.edges.map(({ node }) => node));
      hasNextPage = response.pages.pageInfo.hasNextPage;
      cursor = response.pages.pageInfo.endCursor;

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching pages for ${environment}:`, err);
      throw err;
    }
  }

  return pages;
}

export async function fetchPageDetails(
  environment: Environment,
  id: string
): Promise<DetailedPage> {
  try {
    const response = await shopifyApi.post<{ page: DetailedPage }>(
      environment,
      {
        query: print(PAGE_DETAILS_QUERY),
        variables: { id },
      }
    );
    return response.page;
  } catch (err) {
    logger.error(
      `Error fetching page details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

export async function comparePageDetails(
  productionPage: DetailedPage,
  stagingPage: DetailedPage
): Promise<string[]> {
  const differences: string[] = [];

  if (productionPage.title !== stagingPage.title) {
    differences.push('Title mismatch');
  }
  if (productionPage.body !== stagingPage.body) {
    differences.push('Body mismatch');
  }
  if (productionPage.isPublished !== stagingPage.isPublished) {
    differences.push('Published status mismatch');
  }
  if (productionPage.templateSuffix !== stagingPage.templateSuffix) {
    differences.push('Template suffix mismatch');
  }

  // Compare metafields
  const productionMetafields = new Map(
    productionPage.metafields.edges.map((edge) => [
      `${edge.node.namespace}:${edge.node.key}`,
      edge.node.value,
    ])
  );
  const stagingMetafields = new Map(
    stagingPage.metafields.edges.map((edge) => [
      `${edge.node.namespace}:${edge.node.key}`,
      edge.node.value,
    ])
  );

  if (productionMetafields.size !== stagingMetafields.size) {
    differences.push('Metafields count mismatch');
  } else {
    for (const [key, value] of productionMetafields) {
      if (stagingMetafields.get(key) !== value) {
        differences.push('Metafields content mismatch');
        break;
      }
    }
  }

  return differences;
}

export async function syncPageToEnvironment(
  handle: string,
  sourceEnvironment: Environment,
  targetEnvironment: Environment
): Promise<void> {
  try {
    const sourceId =
      sourceEnvironment === 'production' ? 'production_id' : 'staging_id';
    const targetId =
      sourceEnvironment === 'production' ? 'staging_id' : 'production_id';

    const page = await pageDb.getPageComparison(handle);

    if (!page || !page[sourceId]) {
      throw new Error(`Page ${handle} not found in ${sourceEnvironment}`);
    }

    const sourceDetails = await fetchPageDetails(
      sourceEnvironment,
      page[sourceId]
    );

    const input = {
      title: sourceDetails.title,
      handle: sourceDetails.handle,
      body: sourceDetails.body,
      isPublished: sourceDetails.isPublished,
      templateSuffix: sourceDetails.templateSuffix,
      metafields: sourceDetails.metafields.edges.map((edge) => ({
        namespace: edge.node.namespace,
        key: edge.node.key,
        value: edge.node.value,
        type: edge.node.type,
      })),
    };

    if (page[targetId]) {
      const response = await shopifyApi.post<PageUpdateResponse>(
        targetEnvironment,
        {
          query: print(UPDATE_PAGE_MUTATION),
          variables: {
            id: page[targetId],
            page: input,
          },
        }
      );

      if (response.pageUpdate.userErrors?.length > 0) {
        throw new Error(response.pageUpdate.userErrors[0].message);
      }
    } else {
      const response = await shopifyApi.post<PageCreateResponse>(
        targetEnvironment,
        {
          query: print(CREATE_PAGE_MUTATION),
          variables: { page: input },
        }
      );

      if (response.pageCreate.userErrors?.length > 0) {
        throw new Error(response.pageCreate.userErrors[0].message);
      }
    }
  } catch (err) {
    logger.error(`Failed to sync page ${handle} to ${targetEnvironment}:`, err);
    throw err;
  }
}
