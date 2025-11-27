import { UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { StorefrontArticle } from "@/lib/shopify/types";

interface ArticleCardProps {
  article: StorefrontArticle;
}

/**
 * Format a date string to Vietnamese locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Truncate text to a specific length with ellipsis
 */
function truncateText(text: string | null, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const displayImage = article.image;
  const imageAlt = displayImage?.altText || article.title;
  const formattedDate = formatDate(article.publishedAt);
  const excerpt = truncateText(article.excerpt, 150);
  const formatHandler = decodeURIComponent(article.handle);


  return (
    <article className="flex h-full flex-col prose-a:no-underline group prose prose-p:my-0 prose-img:my-0 overflow-hidden rounded-2xl  bg-white  dark:bg-zinc-900">
      {/* Image with overlay tag */}
      <Link
        href={`/blogs/${article.blogHandle}/${formatHandler}`}
        className="group relative rounded-2xl block aspect-[16/10] overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        aria-label={`Đọc bài viết: ${article.title}`}
      >
        {displayImage ? (
          <Image
            src={displayImage.url}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            Chưa có hình ảnh
          </div>
        )}

        {/* Tag overlay on image */}
        {article.tags.length > 0 && (
          <div className="absolute left-4 top-4">
            <span className="inline-block rounded-md bg-zinc-700/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              {article.tags[0]}
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col py-4 pl-1">
        {/* Date and author */}
        <div className="mb-3 flex min-w-full items-center gap-2 text-xs dark:text-zinc-400">
          <time dateTime={article.publishedAt}>{formattedDate}</time>
          <span>•</span>
          {article.authorName && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {article.authorName}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="mb-2 line-clamp-2 text-lg font-semibold leading-tight">
          <Link
            href={`/blogs/${article.blogHandle}/${formatHandler}`}
            className="text-zinc-900 transition-colors hover:text-brand dark:text-white dark:hover:text-brand"
          >
            {article.title}
          </Link>
        </h1>

        {/* Excerpt */}
        {excerpt && (
          <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {excerpt}
          </p>
        )}
      </div>
    </article>
  );
}
