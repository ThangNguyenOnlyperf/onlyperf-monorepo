/**
 * GraphQL queries for Shopify Blog and Article data
 * Uses Storefront API 2025-04
 */

/**
 * Fetch all blogs from the store
 */
export const BLOGS_QUERY = `#graphql
  query BlogsList($first: Int!) {
    blogs(first: $first, sortKey: TITLE) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;

/**
 * Fetch articles from a specific blog
 */
export const BLOG_ARTICLES_QUERY = `#graphql
  query BlogArticles($blogHandle: String!, $first: Int!, $after: String, $before: String) {
    blog(handle: $blogHandle) {
      id
      title
      handle
      articles(first: $first, sortKey: PUBLISHED_AT, reverse: true, after: $after, before: $before) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        edges {
          cursor
          node {
            id
            title
            handle
            excerpt
            excerptHtml
            contentHtml
            publishedAt
            image {
              url(transform: { maxWidth: 800, maxHeight: 600, preferredContentType: WEBP })
              altText
              width
              height
            }
            authorV2 {
              name
            }
            blog {
              handle
              title
            }
            tags
            seo {
              title
              description
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch a single article by blog handle and article handle
 */
export const ARTICLE_BY_HANDLE_QUERY = `#graphql
  query ArticleByHandle($blogHandle: String!, $articleHandle: String!) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        id
        title
        handle
        contentHtml
        excerpt
        excerptHtml
        publishedAt
        image {
          url(transform: { maxWidth: 1280, maxHeight: 720, preferredContentType: WEBP })
          altText
          width
          height
        }
        authorV2 {
          name
        }
        blog {
          handle
          title
        }
        tags
        seo {
          title
          description
        }
      }
    }
  }
`;
