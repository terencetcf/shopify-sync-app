import gql from 'graphql-tag';

export const PAGES_QUERY = gql`
  query getPages($cursor: String) {
    pages(first: 25, after: $cursor) {
      edges {
        node {
          id
          title
          handle
          updatedAt
          bodySummary
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PAGE_DETAILS_QUERY = gql`
  query getPage($id: ID!) {
    node(id: $id) {
      ... on Page {
        id
        title
        handle
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
  }
`;

export const UPDATE_PAGE_MUTATION = gql`
  mutation updatePage($input: PageInput!) {
    pageUpdate(input: $input) {
      page {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CREATE_PAGE_MUTATION = gql`
  mutation createPage($input: PageInput!) {
    pageCreate(input: $input) {
      page {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;
