import { print } from 'graphql';
import { shopifyApi } from './shopify';
import { Environment } from '../types/environment';
import { logger } from '../utils/logger';
import { DetailedFile, ShopifyFile } from '../types/file';
import { FILES_QUERY, FILE_CREATE_MUTATION } from '../graphql/files';
import { fileDb } from './fileDb';
import { compareField } from '../utils/compareUtils';
import { extractFileName } from '../utils/fileUtils';

interface FileResponse {
  files: {
    edges: Array<{
      node: ShopifyFile;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface FileCreateResponse {
  fileCreate: {
    files: Array<{
      id: string;
      alt: string;
    }>;
    userErrors: Array<{
      field: string[];
      message: string;
    }>;
  };
}

export async function fetchAllFiles(
  environment: Environment
): Promise<ShopifyFile[]> {
  const files: ShopifyFile[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    try {
      const response: FileResponse = await shopifyApi.post<FileResponse>(
        environment,
        {
          query: print(FILES_QUERY),
          variables: {
            cursor,
            query: 'used_in:none status:ready',
          },
        }
      );

      files.push(
        ...response.files.edges.map(({ node }: { node: ShopifyFile }) => node)
      );
      hasNextPage = response.files.pageInfo.hasNextPage;
      cursor = response.files.pageInfo.endCursor;

      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      logger.error(`Error fetching files for ${environment}:`, err);
      throw err;
    }
  }

  return files;
}

export async function compareFileDetails(
  productionFile: DetailedFile,
  stagingFile: DetailedFile
): Promise<string[]> {
  const differences: string[] = [];

  // Compare filename first
  const productionFileName = extractFileName(productionFile.preview.image.url);
  const stagingFileName = extractFileName(stagingFile.preview.image.url);
  compareField('File name', productionFileName, stagingFileName, differences);

  // Then compare other fields
  compareField('Alt text', productionFile.alt, stagingFile.alt, differences);

  return differences;
}

export async function syncFileToEnvironment(
  id: string,
  sourceEnvironment: Environment,
  targetEnvironment: Environment
): Promise<void> {
  try {
    const sourceId =
      sourceEnvironment === 'production' ? 'production_id' : 'staging_id';

    const file = await fileDb.getFileComparison(id);

    if (!file || !file[sourceId]) {
      throw new Error(`File ${id} not found in ${sourceEnvironment}`);
    }

    const response = await shopifyApi.post<FileCreateResponse>(
      targetEnvironment,
      {
        query: print(FILE_CREATE_MUTATION),
        variables: {
          files: [
            {
              alt: file.alt,
              contentType: 'IMAGE',
              originalSource: file.url,
              filename: extractFileName(file.url),
              duplicateResolutionMode: 'REPLACE',
            },
          ],
        },
      }
    );

    if (response.fileCreate.userErrors?.length > 0) {
      throw new Error(response.fileCreate.userErrors[0].message);
    }
  } catch (err) {
    logger.error(`Failed to sync file ${id} to ${targetEnvironment}:`, err);
    throw err;
  }
}
