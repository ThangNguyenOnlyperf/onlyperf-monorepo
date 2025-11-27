/**
 * Shopify Blog and Article service layer
 * Handles fetching and transforming blog/article data from Storefront API
 */

import { storefrontQuery } from "./client";
import type { Locale } from "./locale";
import {
  ARTICLE_BY_HANDLE_QUERY,
  BLOG_ARTICLES_QUERY,
  BLOGS_QUERY,
} from "./queries/articlesQuery";
import type { StorefrontArticle, StorefrontBlog } from "./types";

// GraphQL response types (internal)
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
}

interface ArticleNode {
  id: string;
  title: string;
  handle: string;
  excerpt: string | null;
  excerptHtml: string | null;
  contentHtml: string;
  publishedAt: string;
  image: {
    url: string;
    altText: string | null;
    width: number | null;
    height: number | null;
  } | null;
  authorV2: {
    name: string;
  } | null;
  blog: {
    handle: string;
    title: string;
  };
  tags: string[];
  seo: {
    title: string | null;
    description: string | null;
  } | null;
}

interface ArticleEdge {
  cursor: string;
  node: ArticleNode;
}

interface BlogNode {
  id: string;
  handle: string;
  title: string;
  articles?: {
    pageInfo: PageInfo;
    edges: ArticleEdge[];
  };
}

interface BlogEdge {
  node: BlogNode;
}

interface BlogsQueryResult {
  blogs: {
    edges: BlogEdge[];
  };
}

interface BlogArticlesResult {
  blog: BlogNode | null;
}

interface ArticleByHandleResult {
  blog: {
    articleByHandle: ArticleNode | null;
  } | null;
}

// Transform GraphQL data to app types
function mapArticleNode(node: ArticleNode): StorefrontArticle {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    excerpt: node.excerpt,
    excerptHtml: node.excerptHtml,
    contentHtml: node.contentHtml,
    publishedAt: node.publishedAt,
    image: node.image,
    authorName: node.authorV2?.name ?? null,
    blogHandle: node.blog.handle,
    blogTitle: node.blog.title,
    tags: node.tags,
    seo: node.seo,
  };
}

function mapBlogNode(node: BlogNode): StorefrontBlog {
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
  };
}

/**
 * Fetch all blogs from the store
 */
export async function getAllBlogs(options?: {
  first?: number;
  locale?: Locale;
  buyerIp?: string;
}): Promise<StorefrontBlog[]> {
  const { first = 10, locale, buyerIp } = options ?? {};

  const data = await storefrontQuery<BlogsQueryResult>(BLOGS_QUERY, {
    variables: { first },
    locale,
    buyerIp,
    withInContext: true,
  });

  return data.blogs.edges.map((edge) => mapBlogNode(edge.node));
}

/**
 * Fetch articles from a specific blog
 */
export async function getBlogArticles(
  blogHandle: string,
  options?: {
    first?: number;
    locale?: Locale;
    buyerIp?: string;
  }
): Promise<StorefrontArticle[]> {
  const { first = 20, locale, buyerIp } = options ?? {};

  const data = await storefrontQuery<BlogArticlesResult>(BLOG_ARTICLES_QUERY, {
    variables: { blogHandle, first },
    locale,
    buyerIp,
    withInContext: true,
  });

  if (!data.blog) {
    return [];
  }

  return (
    data.blog.articles?.edges.map((edge) => mapArticleNode(edge.node)) ?? []
  );
}

/**
 * Fetch articles from a specific blog with pagination support
 */
export async function getBlogArticlesPaginated(
  blogHandle: string,
  options?: {
    first?: number;
    after?: string | null;
    before?: string | null;
    locale?: Locale;
    buyerIp?: string;
  }
): Promise<{
  articles: StorefrontArticle[];
  pageInfo: PageInfo;
}> {
  const { first = 12, after, before, locale, buyerIp } = options ?? {};

  const data = await storefrontQuery<BlogArticlesResult>(BLOG_ARTICLES_QUERY, {
    variables: {
      blogHandle,
      first,
      after: after ?? undefined,
      before: before ?? undefined,
    },
    locale,
    buyerIp,
    withInContext: true,
  });

  if (!data.blog?.articles) {
    return {
      articles: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: null,
        startCursor: null,
      },
    };
  }

  return {
    articles: data.blog.articles.edges.map((edge) => mapArticleNode(edge.node)),
    pageInfo: data.blog.articles.pageInfo,
  };
}

/**
 * Fetch articles from all blogs and merge them into a single array
 * Sorted by publication date (newest first)
 */
export async function getAllArticles(options?: {
  articlesPerBlog?: number;
  maxArticles?: number;
  locale?: Locale;
  buyerIp?: string;
}): Promise<StorefrontArticle[]> {
  const {
    articlesPerBlog = 30,
    maxArticles = 30,
    locale,
    buyerIp,
  } = options ?? {};

  // First, fetch all blogs
  const blogs = await getAllBlogs({
    first: 10,
    locale,
    buyerIp,
  });

  if (blogs.length === 0) {
    return [];
  }

  // Fetch articles from all blogs in parallel
  const articlesPromises = blogs.map((blog) =>
    getBlogArticles(blog.handle, {
      first: articlesPerBlog,
      locale,
      buyerIp,
    })
  );

  const articlesArrays = await Promise.all(articlesPromises);

  // Flatten all articles into a single array
  const allArticles = articlesArrays.flat();

  // Sort by publication date (newest first)
  allArticles.sort((a, b) => {
    const dateA = new Date(a.publishedAt);
    const dateB = new Date(b.publishedAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Limit to maxArticles
  return allArticles.slice(0, maxArticles);
}

/**
 * Fetch articles from all blogs with pagination support
 * Returns articles from the first blog found (simplified pagination)
 * For multi-blog pagination, consider using getBlogArticlesPaginated() directly
 */
export async function getAllArticlesPaginated(options?: {
  first?: number;
  after?: string | null;
  before?: string | null;
  locale?: Locale;
  buyerIp?: string;
}): Promise<{
  articles: StorefrontArticle[];
  pageInfo: PageInfo;
}> {
  const { first = 10, after, before, locale, buyerIp } = options ?? {};

  // First, fetch all blogs to get the first blog handle
  const blogs = await getAllBlogs({
    first,
    locale,
    buyerIp,
  });

  if (blogs.length === 0) {
    return {
      articles: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: null,
        startCursor: null,
      },
    };
  }

  // Use the first blog for pagination
  // If you need to paginate across all blogs, you'll need a different approach
  const firstBlog = blogs[0];

  return getBlogArticlesPaginated(firstBlog.handle, {
    first,
    after,
    before,
    locale,
    buyerIp,
  });
}

/**
 * Extract all unique tags from an array of articles
 */
export function getAllUniqueTags(articles: StorefrontArticle[]): string[] {
  const tagSet = new Set<string>();

  for (const article of articles) {
    for (const tag of article.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Sort articles based on sort option
 */
function sortArticles(
  articles: StorefrontArticle[],
  sortBy?: string
): StorefrontArticle[] {
  if (!sortBy) {
    return articles;
  }

  const sorted = [...articles];

  switch (sortBy) {
    case "newest":
      sorted.sort((a, b) => {
        const dateA = new Date(a.publishedAt);
        const dateB = new Date(b.publishedAt);
        return dateB.getTime() - dateA.getTime();
      });
      break;

    case "oldest":
      sorted.sort((a, b) => {
        const dateA = new Date(a.publishedAt);
        const dateB = new Date(b.publishedAt);
        return dateA.getTime() - dateB.getTime();
      });
      break;

    case "a-z":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "vi"));
      break;

    case "z-a":
      sorted.sort((a, b) => b.title.localeCompare(a.title, "vi"));
      break;

    default:
      // Default: newest first (already sorted by getAllArticles)
      break;
  }

  return sorted;
}

/**
 * Filter articles by tags (AND logic - article must have ALL selected tags)
 */
function filterArticlesByTags(
  articles: StorefrontArticle[],
  tags?: string[]
): StorefrontArticle[] {
  if (!tags || tags.length === 0) {
    return articles;
  }

  return articles.filter((article) =>
    tags.every((tag) => article.tags.includes(tag))
  );
}

/**
 * Fetch all articles and return paginated result using offset-based pagination
 * This approach fetches all articles upfront for numbered pagination (1, 2, 3)
 */
export async function getAllArticlesForListing(options?: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  tags?: string[];
  locale?: Locale;
  buyerIp?: string;
}): Promise<{
  articles: StorefrontArticle[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> {
  const pageSize = Math.max(1, options?.pageSize ?? 12);
  const requestedPage = Math.max(1, options?.page ?? 1);

  // Fetch all articles upfront (max 100 for reasonable performance)
  let allArticles = await getAllArticles({
    maxArticles: 100,
    articlesPerBlog: 50,
    locale: options?.locale,
    buyerIp: options?.buyerIp,
  });

  // Apply tags filter (AND logic - must have all selected tags)
  allArticles = filterArticlesByTags(allArticles, options?.tags);

  // Apply sorting
  allArticles = sortArticles(allArticles, options?.sortBy);

  const total = allArticles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page to valid range
  const page = Math.min(requestedPage, totalPages);

  // Calculate slice indices
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Slice articles for current page
  const articles = allArticles.slice(startIndex, endIndex);

  return {
    articles,
    total,
    page,
    totalPages,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Fetch articles from a specific blog and return paginated result using offset-based pagination
 * This approach fetches all articles from the blog upfront for numbered pagination (1, 2, 3)
 */
export async function getBlogArticlesForListing(
  blogHandle: string,
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    tags?: string[];
    locale?: Locale;
    buyerIp?: string;
  },
): Promise<{
  articles: StorefrontArticle[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}> {
  const pageSize = Math.max(1, options?.pageSize ?? 12);
  const requestedPage = Math.max(1, options?.page ?? 1);

  // Fetch all articles from the specific blog upfront
  let allArticles = await getBlogArticles(blogHandle, {
    first: 100, // Fetch up to 100 articles
    locale: options?.locale,
    buyerIp: options?.buyerIp,
  });

  // Apply tags filter (AND logic - must have all selected tags)
  allArticles = filterArticlesByTags(allArticles, options?.tags);

  // Apply sorting
  allArticles = sortArticles(allArticles, options?.sortBy);

  const total = allArticles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Clamp page to valid range
  const page = Math.min(requestedPage, totalPages);

  // Calculate slice indices
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // Slice articles for current page
  const articles = allArticles.slice(startIndex, endIndex);

  return {
    articles,
    total,
    page,
    totalPages,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Fetch a single article by blog handle and article handle
 */
export async function getArticleByHandle(
  blogHandle: string,
  articleHandle: string,
  options?: {
    locale?: Locale;
    buyerIp?: string;
  }
): Promise<StorefrontArticle | null> {
  const { locale, buyerIp } = options ?? {};

  const data = await storefrontQuery<ArticleByHandleResult>(
    ARTICLE_BY_HANDLE_QUERY,
    {
      variables: { blogHandle, articleHandle },
      locale,
      buyerIp,
      withInContext: true,
    }
  );

  if (!data.blog?.articleByHandle) {
    return null;
  }

  return mapArticleNode(data.blog.articleByHandle);
}
const query = `
query BlogsAll {
  blogs(first: 50) {
    nodes {
      id
      handle
      title
    }
  }
}
`;

interface OrganizationBlog {
  id: string;
  handle: string;
  title: string;
}
interface OrganizationBlogs {
  blogs: {
    nodes: OrganizationBlog[];
  };
}

export async function queryBlogsInOrganization(): Promise<
  OrganizationBlog[] | null
> {
  const data: OrganizationBlogs = await storefrontQuery(query);

  if (!data?.blogs?.nodes) return null;

  return data.blogs.nodes;
}
