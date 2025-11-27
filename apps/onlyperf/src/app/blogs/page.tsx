import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import {
  getAllArticles,
  getAllArticlesForListing,
  getAllUniqueTags,
} from "@/lib/shopify/blogs";
import { getServerLocale } from "@/lib/shopify/locale";
import { parsePageParam } from "@/lib/url-utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/components/ui/pagination";

interface BlogsPageProps {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    tags?: string;
  }>;
}

export const pageSize = 12
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  // If 5 or fewer pages, show all
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];

  // Add ellipsis after 1 if current page is far from start
  if (currentPage > 3) {
    pages.push("...");
  }

  // Add pages around current page
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis before last if current page is far from end
  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Blog ",
    description:
      "Khám phá các bài viết, tin tức và cẩm nang về thể thao, fitness và phong cách sống khỏe mạnh từ OnlyPerf.",
    openGraph: {
      title: "Blog ",
      description:
        "Khám phá các bài viết, tin tức và cẩm nang về thể thao, fitness và phong cách sống khỏe mạnh.",
      type: "website",
    },
  };
}

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  // Await searchParams as per Next.js 15
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const sort = params.sort;
  const tagsParam = params.tags;
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  // Get locale for localized content
  const { locale, buyerIp } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });

  // Fetch all articles to get unique tags for filter
  const allArticles = await getAllArticles({
    maxArticles: 100,
    articlesPerBlog: 50,
    locale,
    buyerIp,
  });
  const availableTags = getAllUniqueTags(allArticles);

  // Fetch articles with offset-based pagination and filters
  const listing = await getAllArticlesForListing({
    page,
    pageSize: pageSize,
    sortBy: sort,
    tags,
    locale,
    buyerIp,
  });

  // Helper to build pagination URL with filters
  const buildPaginationUrl = (pageNum: number): string => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (sort) params.set("sort", sort);
    if (tagsParam) params.set("tags", tagsParam);
    return `/blogs?${params.toString()}`;
  };

  return (
    <main className="container-page">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-primary">
          Tin tức & Bài viết
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
          Mọi thứ về Pickle ball
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Khám phá các bài viết, tin tức và cẩm nang về thể thao, fitness và
          phong cách sống khỏe mạnh.
        </p>
      </header>

      {/* Filters */}
      <BlogFilters availableTags={availableTags} />

      {listing.articles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          Hiện chưa có bài viết nào. Vui lòng quay lại sau.
        </div>
      ) : (
        <>
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listing.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </section>

          {/* Numbered Pagination */}
          {listing.totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {/* Previous Button */}
                {listing.hasPreviousPage && (
                  <PaginationItem>
                    <PaginationPrevious
                      href={buildPaginationUrl(listing.page - 1)}
                    />
                  </PaginationItem>
                )}

                {/* Page Numbers */}
                {generatePageNumbers(listing.page, listing.totalPages).map(
                  (pageNum, index) => {
                    if (pageNum === "...") {
                      return (
                        <PaginationItem key={`ellipsis-${index}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href={buildPaginationUrl(pageNum as number)}
                          isActive={pageNum === listing.page}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  },
                )}

                {/* Next Button */}
                {listing.hasNextPage && (
                  <PaginationItem>
                    <PaginationNext href={buildPaginationUrl(listing.page + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </main>
  );
}
