import { UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { processArticleContent } from "@/lib/blog/toc-utils";
import type { StorefrontArticle } from "@/lib/shopify/types";
import { TableOfContents } from "./TableOfContents";
import { TableOfContentsMobile } from "./TableOfContentsMobile";

interface ArticleContentProps {
  article: StorefrontArticle;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function ArticleContent({ article }: ArticleContentProps) {
  const formattedDate = formatDate(article.publishedAt);
  const { processedHtml, headings } = processArticleContent(
    article.contentHtml,
  );

  return (
    <div className="container-max mx-auto min-w-full">

      <div className="relative">

        {/* Main content */}
        {article.image && (
            <div className="relative mb-8 aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={article.image.url}
                alt={article.image.altText || article.title}
                fill
                sizes="(min-width: 896px) 896px, 100vw"
                className="object-cover rounded-xl"
                priority
              />
            </div>
          )}
        <article className="prose prose-h1:3xl prose-h2:2xl md:prose-h2:text-4xl prose-p:text-black min-w-full prose-img:mt-0 prose-a:no-underline">
          {/* Header with margins */}
         <div className="flex justify-center">
         <header className="mb-8 space-y-6 sm:max-w-4xl">
            {/* Date */}
            <div className="text-xs flex justify-center uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
              <time dateTime={article.publishedAt}>Ngày đăng : {formattedDate} - bởi {article.authorName}</time>
            </div>

            {/* Title */}
            <h1 className=" font-bold flex justify-center text-center mb-4 leading-tight text-zinc-900 dark:text-white ">
              {article.title}
            </h1>

            {/* Excerpt */}
            {article.excerpt && (
              <div className="flex items-center justify-center prose-p:my-0 ">
                <p className="text-lg text-center leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {article.excerpt}
                </p>
              </div>
            )}

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex justify-center flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex h-8 items-center rounded-lg border border-zinc-200 bg-gray-300 px-3 py-2 text-xs md:text-base font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          
         </div>

          {/* Mobile: ToC above content (static, collapsible) */}
          <div className="mb-8 md:hidden">
            <TableOfContentsMobile headings={headings} />
          </div>

          {/* Desktop: Grid layout with ToC on the side */}
          <div className="md:grid md:grid-cols-10 md:gap-6">
            {/* Article content - 7 columns */}
            <div className="md:col-span-7">
              <div className="flex justify-center">
                <div
                  className="sm:max-w-4xl"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Article content from trusted Shopify CMS
                  dangerouslySetInnerHTML={{ __html: processedHtml }}
                />
              </div>
            </div>

            {/* ToC - 3 columns, sticky on desktop with scroll tracking */}
            <div className="hidden md:block md:col-span-3">
              <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <TableOfContents headings={headings} />
              </div>
            </div>
          </div>

          {/* Article Footer with margins */}
          <footer className="mt-12 border-t border-zinc-200 px-4 pt-8 dark:border-zinc-800 sm:px-6">
            <div className="flex items-center justify-between">
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:underline"
              >
                ← Quay lại Blog
              </Link>

              {article.blogTitle && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Danh mục:{" "}
                  <Link
                    href={`/blogs/${article.blogHandle}`}
                    className="font-medium text-zinc-900 hover:text-brand dark:text-white"
                  >
                    {article.blogTitle}
                  </Link>
                </span>
              )}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
