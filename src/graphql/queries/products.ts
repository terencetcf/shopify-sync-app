import gql from 'graphql-tag';

export const PRODUCTS_QUERY = gql`
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
`;

export const PRODUCT_DETAILS_QUERY = gql`
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
`;
