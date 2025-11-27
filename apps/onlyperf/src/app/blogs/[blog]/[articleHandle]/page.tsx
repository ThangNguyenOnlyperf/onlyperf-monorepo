import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleBreadcrumb } from "@/components/blog/ArticleBreadcrumb";
import { ArticleContent } from "@/components/blog/ArticleContent";
import {
  getArticleByHandle,
  queryBlogsInOrganization,
} from "@/lib/shopify/blogs";
import { getServerLocale } from "@/lib/shopify/locale";

interface ArticlePageProps {
  params: Promise<{ blog: string; articleHandle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { blog, articleHandle } = await params;
  const decodedBlog = decodeURIComponent(blog);
  const decodedArticle = decodeURIComponent(articleHandle);

  // Fetch article for metadata
  const article = await getArticleByHandle(decodedBlog, decodedArticle);

  if (!article) {
    return {
      title: "Không tìm thấy | OnlyPerf",
    };
  }

  return {
    title: article.seo?.title || `${article.title} | OnlyPerf`,
    description: article.seo?.description || article.excerpt || undefined,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      type: "article",
      publishedTime: article.publishedAt,
      images: article.image
        ? [
            {
              url: article.image.url,
              alt: article.image.altText || article.title,
            },
          ]
        : undefined,
      authors: article.authorName ? [article.authorName] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || undefined,
      images: article.image ? [article.image.url] : undefined,
    },
  };
}

export default async function ArticleDetailPage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { blog, articleHandle } = await params;
  const decodedBlog = decodeURIComponent(blog);
  const decodedArticle = decodeURIComponent(articleHandle);

  // Validate blog exists in Shopify
  const blogs = await queryBlogsInOrganization();
  const blogData = blogs?.find((b) => b.handle === decodedBlog);

  if (!blogData) {
    notFound();
  }

  // Get locale
  const { locale, buyerIp } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });

  // Fetch article by blog handle and article handle
  const article = await getArticleByHandle(decodedBlog, decodedArticle, {
    locale,
    buyerIp,
  });

  // Handle not found
  if (!article) {
    notFound();
  }

  return (
    <main className="container-page">
      <ArticleBreadcrumb article={article} />
      <ArticleContent article={article} />
    </main>
  );
}
