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
        bodySummary
        body
        bodyHtml
        author {
          firstName
          lastName
        }
        seo {
          title
          description
        }
        updatedAt
        onlineStoreUrl
      }
    }
  }
`;
