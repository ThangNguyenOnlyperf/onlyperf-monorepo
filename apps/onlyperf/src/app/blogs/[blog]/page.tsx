import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import {
  getBlogArticles,
  getBlogArticlesForListing,
  getAllUniqueTags,
  queryBlogsInOrganization,
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
import { pageSize } from "../page";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BlogPageProps {
  params: Promise<{ blog: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    tags?: string;
  }>;
}


function generatePageNumbers(
  currentPage: number,
  totalPages: number,
): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];


  if (currentPage > 3) {
    pages.push("...");
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }


  if (currentPage < totalPages - 2) {
    pages.push("...");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export async function generateStaticParams() {
  const blogs = await queryBlogsInOrganization();

  if (!blogs) {
    return [];
  }

  return blogs.map((blog) => ({
    blog: blog.handle,
  }));
}

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { blog } = await params;
  const decodedBlog = decodeURIComponent(blog);

  const blogs = await queryBlogsInOrganization();
  const blogData = blogs?.find((b) => b.handle === decodedBlog);

  if (!blogData) {
    return {
      title: "Không tìm thấy | OnlyPerf",
    };
  }

  return {
    title: `${blogData.title} | OnlyPerf`,
    description: `Khám phá các bài viết từ ${blogData.title} - tin tức, cẩm nang và bài viết về thể thao, fitness từ OnlyPerf.`,
    openGraph: {
      title: `${blogData.title} | OnlyPerf`,
      description: `Khám phá các bài viết từ ${blogData.title}`,
      type: "website",
    },
  };
}

export default async function BlogPage({
  params,
  searchParams,
}: BlogPageProps) {
  const { blog } = await params;
  const decodedBlog = decodeURIComponent(blog);

  const searchParamsResolved = await searchParams;
  const page = parsePageParam(searchParamsResolved.page);
  const sort = searchParamsResolved.sort;
  const tagsParam = searchParamsResolved.tags;
  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  const { locale, buyerIp } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });

  const blogs = await queryBlogsInOrganization();
  const blogData = blogs?.find((b) => b.handle === decodedBlog);

  if (!blogData) {
    notFound();
  }

  const allArticles = await getBlogArticles(decodedBlog, {
    first: 100,
    locale,
    buyerIp,
  });
  const availableTags = getAllUniqueTags(allArticles);

  const listing = await getBlogArticlesForListing(decodedBlog, {
    page,
    pageSize: 2,
    sortBy: sort,
    tags,
    locale,
    buyerIp,
  });

  const buildPaginationUrl = (pageNum: number): string => {
    const params = new URLSearchParams();
    params.set("page", pageNum.toString());
    if (sort) params.set("sort", sort);
    if (tagsParam) params.set("tags", tagsParam);
    return `/blogs/${decodedBlog}?${params.toString()}`;
  };

  return (
    <main className="container-page prose prose-h1:my-0">
        <Link href={"/blogs"} className="flex gap-2 items-center hover:">
             <ChevronLeft /> 
             Quay lại trang tất cả tin
        </Link>
      <header className="space-y-3">
        <div className="flex w-full items-center justify-between">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white ">
          {blogData.title}
        </h1>
        <BlogFilters availableTags={availableTags} />
        </div>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Khám phá các bài viết, tin tức và cẩm nang từ {blogData.title}.
        </p>
      </header>


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
