import { logger } from './logger';

export function compareField(
  field: string,
  productionValue: any,
  stagingValue: any,
  differences: string[]
) {
  if (productionValue !== stagingValue) {
    differences.push(field);
    logger.info(`${field} mismatch`, productionValue, stagingValue);
  }
}

export function compareMetafields(
  productionMetafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }>;
  },
  stagingMetafields: {
    edges: Array<{
      node: {
        namespace: string;
        key: string;
        value: string;
      };
    }>;
  },
  differences: string[]
) {
  const productionMap = new Map(
    productionMetafields.edges.map((edge) => [
      `${edge.node.namespace}:${edge.node.key}`,
      edge.node.value,
    ])
  );
  const stagingMap = new Map(
    stagingMetafields.edges.map((edge) => [
      `${edge.node.namespace}:${edge.node.key}`,
      edge.node.value,
    ])
  );

  if (productionMap.size !== stagingMap.size) {
    differences.push('Metafields count');
    logger.info(
      'Metafields count mismatch',
      productionMap.size,
      stagingMap.size
    );
    return;
  }

  for (const [key, value] of productionMap) {
    if (stagingMap.get(key) !== value) {
      differences.push('Metafields content');
      logger.info('Metafields content mismatch', stagingMap.get(key), value);
      break;
    }
  }
}

export function isTrueOrDefault(
  value: string | boolean | null,
  defaultValue: boolean
) {
  return value === null ? defaultValue : String(value).toLowerCase() === 'true';
}
