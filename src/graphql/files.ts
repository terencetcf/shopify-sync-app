import gql from 'graphql-tag';

export const FILES_QUERY = gql`
  query FilesQuery($cursor: String, $query: String) {
    files(first: 250, after: $cursor, query: $query) {
      edges {
        node {
          id
          alt
          preview {
            image {
              url
            }
            status
          }
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const FILE_CREATE_MUTATION = gql`
  mutation fileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
        alt
        createdAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;
