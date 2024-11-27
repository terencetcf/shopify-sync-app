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
        templateSuffix
        vendor
        category {
          id
          name
        }
        combinedListingRole
        collections(first: 250) {
          edges {
            node {
              handle
            }
          }
        }
        productType
        options {
          linkedMetafield {
            key
            namespace
          }
          name
          position
          values
        }
        requiresSellingPlan
        seo {
          title
          description
        }
        status
        tags
        metafields(first: 250) {
          edges {
            node {
              namespace
              key
              value
              type
            }
          }
        }
        isGiftCard
        giftCardTemplateSuffix
        descriptionHtml
        updatedAt
        totalInventory
        onlineStoreUrl
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
        media(first: 250) {
          edges {
            node {
              mediaContentType
              status
              preview {
                image {
                  altText
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;
