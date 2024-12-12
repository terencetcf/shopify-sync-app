import gql from 'graphql-tag';

export const PAGES_QUERY = gql`
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

export const PAGE_DETAILS_QUERY = gql`
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

export const CREATE_PAGE_MUTATION = gql`
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

export const UPDATE_PAGE_MUTATION = gql`
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
