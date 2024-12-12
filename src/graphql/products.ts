import gql from 'graphql-tag';

export const PRODUCTS_QUERY = gql`
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

export const PRODUCT_DETAILS_QUERY = gql`
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

export const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
    productCreate(input: $input, media: $media) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
    productUpdate(input: $input, media: $media) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;
