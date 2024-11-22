import axios from 'axios';
import { BasicProduct, DetailedProduct } from '../types/product';
import { BasicCollection, DetailedCollection } from '../types/collection';

interface ProductsResponse {
  products: {
    edges: Array<{
      node: BasicProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface ProductResponse {
  node: DetailedProduct;
}

interface CollectionsResponse {
  collections: {
    edges: Array<{
      node: BasicCollection;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

interface CollectionResponse {
  node: DetailedCollection;
}

export const shopifyApi = {
  async fetchProducts(cursor?: string | null) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: `
          query getProducts($cursor: String) {
            products(first: 25, after: $cursor) {
              edges {
                node {
                  id
                  title
                  handle
                  productType
                  updatedAt
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        variables: { cursor },
      },
    });

    return data.data as ProductsResponse;
  },

  async fetchProductDetails(id: string) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: `
          query getProduct($id: ID!) {
            node(id: $id) {
              ... on Product {
                id
                title
                handle
                status
                description
                descriptionHtml
                onlineStoreUrl
                totalInventory
                vendor
                productType
                updatedAt
                options {
                  id
                  name
                  position
                  values
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                tags
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                      price
                      compareAtPrice
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                      image {
                        id
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                seo {
                  title
                  description
                }
                metafields(first: 10) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id },
      },
    });

    return data.data as ProductResponse;
  },

  async fetchCollections(cursor?: string | null) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: `
          query getCollections($cursor: String) {
            collections(first: 25, after: $cursor) {
              edges {
                node {
                  id
                  title
                  handle
                  productsCount
                  updatedAt
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        variables: { cursor },
      },
    });

    return data.data as CollectionsResponse;
  },

  async fetchCollectionDetails(id: string) {
    const { data } = await axios({
      url: import.meta.env.VITE_SHOPIFY_STORE_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': import.meta.env.VITE_SHOPIFY_ACCESS_TOKEN,
      },
      data: {
        query: `
          query getCollection($id: ID!) {
            node(id: $id) {
              ... on Collection {
                id
                title
                handle
                description
                descriptionHtml
                productsCount
                updatedAt
                products(first: 25) {
                  edges {
                    node {
                      id
                      title
                      handle
                      status
                      totalInventory
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id },
      },
    });

    return data.data as CollectionResponse;
  },
};
