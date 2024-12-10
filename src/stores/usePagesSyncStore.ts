import { create } from 'zustand';
import { shopifyApi } from '../services/shopify';
import { logger } from '../utils/logger';
import { Environment } from '../types/sync';
import { PageInfo } from '../types/pageInfo';
import { pageDb } from '../services/pageDb';

interface ShopifyPage {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
}

export interface PageComparison {
  id: string;
  handle: string;
  production_id: string | null;
  staging_id: string | null;
  title: string;
  differences: string;
  updated_at: string;
  compared_at: string;
}

export interface DetailedPage {
  id: string;
  handle: string;
  title: string;
  updatedAt: string;
  body: string;
  bodySummary: string;
  isPublished: boolean;
  publishedAt: string | null;
  templateSuffix: string | null;
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

interface PagesSyncStore {
  pages: PageComparison[];
  selectedPage: DetailedPage | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  error: string | null;
  fetchStoredPages: () => Promise<void>;
  comparePages: () => Promise<void>;
  syncPages: (
    handles: string[],
    targetEnvironment: Environment
  ) => Promise<void>;
  fetchPageDetails: (id: string, environment: Environment) => Promise<void>;
}

interface ShopifyPageResponse {
  pages: {
    edges: Array<{
      node: ShopifyPage;
    }>;
    pageInfo: PageInfo;
  };
}

interface DetailedShopifyPage extends ShopifyPage {
  body: string;
  bodySummary: string;
  isPublished: boolean;
  publishedAt: string | null;
  templateSuffix: string | null;
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

const PAGES_QUERY = `
  query GetPages($cursor: String) {
    pages(first: 250, after: $cursor) {
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

const PAGE_DETAILS_QUERY = `
  query GetPageDetails($id: ID!) {
    page(id: $id) {
      id
      handle
      title
      updatedAt
      body
      bodySummary
      isPublished
      publishedAt
      templateSuffix
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

const CREATE_PAGE_MUTATION = `
  mutation CreatePage($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page {
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

const UPDATE_PAGE_MUTATION = `
  mutation UpdatePage($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page {
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

async function fetchAllPages(environment: Environment): Promise<ShopifyPage[]> {
  const pages: ShopifyPage[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      logger.info(`Fetching pages for ${environment} with cursor: ${cursor}`);

      const response: ShopifyPageResponse =
        await shopifyApi.post<ShopifyPageResponse>(environment, {
          query: PAGES_QUERY,
          variables: { cursor },
        });

      const {
        edges,
        pageInfo,
      }: {
        edges: Array<{ node: ShopifyPage }>;
        pageInfo: { hasNextPage: boolean; endCursor: string };
      } = response.pages;

      const newPages = edges.map(({ node }) => node);
      pages.push(...newPages);

      logger.info(`Fetched ${newPages.length} pages for ${environment}`);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching pages for ${environment}:`, err);
      throw err;
    }
  }

  logger.info(`Total pages fetched for ${environment}: ${pages.length}`);
  return pages;
}

async function fetchPageDetails(
  environment: Environment,
  id: string
): Promise<DetailedShopifyPage> {
  try {
    const response = await shopifyApi.post<{
      page: DetailedShopifyPage;
    }>(environment, {
      query: PAGE_DETAILS_QUERY,
      variables: { id },
    });
    return response.page;
  } catch (err) {
    logger.error(
      `Error fetching page details for ${id} in ${environment}:`,
      err
    );
    throw err;
  }
}

async function comparePageDetails(
  productionPage: DetailedShopifyPage,
  stagingPage: DetailedShopifyPage
): Promise<string[]> {
  const differences: string[] = [];

  // Compare basic fields
  if (productionPage.title !== stagingPage.title) {
    differences.push('Title mismatch');
  }
  if (productionPage.body !== stagingPage.body) {
    differences.push('Body mismatch');
    if (productionPage.handle === 'accessories') {
      logger.info('Body mismatch PROD:', productionPage.body);
      logger.info('Body mismatch STAG:', stagingPage.body);
    }
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

async function syncPageToEnvironment(
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

    // Fetch detailed page data from source
    const sourceDetails = await fetchPageDetails(
      sourceEnvironment,
      page[sourceId]
    );

    // Prepare mutation input
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
      // Update existing page
      const response = await shopifyApi.post<PageUpdateResponse>(
        targetEnvironment,
        {
          query: UPDATE_PAGE_MUTATION,
          variables: {
            id: page[targetId],
            page: input,
          },
        }
      );

      if (response.pageUpdate.userErrors?.length > 0) {
        throw new Error(response.pageUpdate.userErrors[0].message);
      }

      logger.info(
        `Successfully updated page ${handle} in ${targetEnvironment}`
      );
    } else {
      // Create new page
      const response = await shopifyApi.post<PageCreateResponse>(
        targetEnvironment,
        {
          query: CREATE_PAGE_MUTATION,
          variables: {
            page: input,
          },
        }
      );

      if (response.pageCreate.userErrors?.length > 0) {
        throw new Error(response.pageCreate.userErrors[0].message);
      }

      logger.info(
        `Successfully created page ${handle} in ${targetEnvironment}`
      );
    }
  } catch (err) {
    logger.error(`Failed to sync page ${handle} to ${targetEnvironment}:`, err);
    throw err;
  }
}

export const usePagesSyncStore = create<PagesSyncStore>((set, get) => ({
  pages: [],
  selectedPage: null,
  isLoading: false,
  isLoadingDetails: false,
  error: null,

  fetchStoredPages: async () => {
    set({ isLoading: true, error: null });
    try {
      const pages = await pageDb.getPageComparisons();
      set({ pages, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to fetch stored pages:', err);
    }
  },

  comparePages: async () => {
    set({ isLoading: true, error: null });
    try {
      logger.info('Starting page comparison...');
      const [productionPages, stagingPages] = await Promise.all([
        fetchAllPages('production'),
        fetchAllPages('staging'),
      ]);

      const productionMap = new Map(productionPages.map((p) => [p.handle, p]));
      const stagingMap = new Map(stagingPages.map((p) => [p.handle, p]));

      const allHandles = new Set([
        ...productionMap.keys(),
        ...stagingMap.keys(),
      ]);

      logger.info(`Total unique handles found: ${allHandles.size}`);

      for (const handle of allHandles) {
        const productionPage = productionMap.get(handle);
        const stagingPage = stagingMap.get(handle);

        let differences: string[] = [];

        if (!productionPage) {
          differences = ['Missing in production'];
        } else if (!stagingPage) {
          differences = ['Missing in staging'];
        } else if (productionPage.updatedAt !== stagingPage.updatedAt) {
          // Fetch and compare detailed page data
          logger.info(`Detailed comparison needed for ${handle}`);
          const [productionDetails, stagingDetails] = await Promise.all([
            fetchPageDetails('production', productionPage.id),
            fetchPageDetails('staging', stagingPage.id),
          ]);

          differences = await comparePageDetails(
            productionDetails,
            stagingDetails
          );
        } else {
          differences = ['In sync'];
        }

        await pageDb.setPageComparison({
          id: '',
          handle,
          production_id: productionPage?.id ?? null,
          staging_id: stagingPage?.id ?? null,
          title: (productionPage || stagingPage)?.title ?? '',
          differences: differences.join(', ') || 'In sync',
          updated_at: (productionPage || stagingPage)!.updatedAt,
          compared_at: new Date().toISOString(),
        });
      }

      await get().fetchStoredPages();
      logger.info('Page comparison completed successfully');
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to compare pages:', err);
    }
  },

  syncPages: async (handles: string[], targetEnvironment: Environment) => {
    set({ isLoading: true, error: null });
    try {
      const sourceEnvironment =
        targetEnvironment === 'production' ? 'staging' : 'production';
      const sourceIdField =
        sourceEnvironment === 'production' ? 'production_id' : 'staging_id';
      const targetIdField =
        targetEnvironment === 'production' ? 'production_id' : 'staging_id';

      for (const handle of handles) {
        // Sync the page
        await syncPageToEnvironment(
          handle,
          sourceEnvironment,
          targetEnvironment
        );

        // Update the page in state and database
        const page = await pageDb.getPageComparison(handle);
        if (page) {
          // Update database
          await pageDb.setPageComparison({
            ...page,
            [targetIdField]: page[sourceIdField],
            differences: 'In sync',
            compared_at: new Date().toISOString(),
          });

          // Update state
          set((state) => ({
            pages: state.pages.map((p) =>
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
      }

      set({ isLoading: false });
      logger.info(
        `Successfully synced ${handles.length} pages to ${targetEnvironment}`
      );
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      logger.error('Failed to sync pages:', err);
      throw err;
    }
  },

  fetchPageDetails: async (id: string, environment: Environment) => {
    set({ isLoadingDetails: true, error: null });
    try {
      const response = await shopifyApi.post<{
        page: DetailedPage;
      }>(environment, {
        query: PAGE_DETAILS_QUERY,
        variables: { id },
      });
      set({
        selectedPage: response.page,
        isLoadingDetails: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.errors?.[0]?.message ||
        'Failed to fetch page details';
      set({ error: errorMessage, isLoadingDetails: false });
      logger.error('Error fetching page details:', err);
    }
  },
}));
