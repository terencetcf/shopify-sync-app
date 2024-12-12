import gql from 'graphql-tag';

export const COLLECTIONS_QUERY = gql`
  query GetCollections($cursor: String) {
    collections(first: 250, after: $cursor) {
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

export const COLLECTION_DETAILS_QUERY = gql`
  query GetCollectionDetails($id: ID!) {
    collection(id: $id) {
      id
      handle
      title
      updatedAt
      description
      descriptionHtml
      sortOrder
      templateSuffix
      image {
        altText
        url
      }
      seo {
        title
        description
      }
      productsCount {
        count
      }
      products(first: 250) {
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
`;

export const UPDATE_COLLECTION_MUTATION = gql`
  mutation updateCollection($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_COLLECTION_MUTATION = gql`
  mutation createCollection($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COLLECTION_ADD_PRODUCTS_MUTATION = gql`
  mutation collectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
