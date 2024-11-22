import gql from 'graphql-tag';

export const COLLECTIONS_QUERY = gql`
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
`;

export const COLLECTION_DETAILS_QUERY = gql`
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
`;
