import Link from "next/link";

import { ProductCard } from "@/components/ProductCard";
import { ProductsFilterPanel } from "@/components/ProductsFilterPanel";
import {
  getProductListing,
  type ProductListingResult,
} from "@/lib/shopify/storefront";
import {
  buildQueryString,
  parsePageParam,
  parseSearchParamArray,
} from "@/lib/url-utils";

const PAGE_SIZE = 2;

function buildProductListingQuery(
  listing: ProductListingResult,
  overrides: { page?: number } = {},
): string {
  const activeColors = listing.filters.colors
    .filter((filter) => filter.isActive)
    .map((filter) => filter.token);

  const activeSizes = listing.filters.sizes
    .filter((filter) => filter.isActive)
    .map((filter) => filter.token);

  return buildQueryString({
    colors: activeColors.length ? activeColors : undefined,
    sizes: activeSizes.length ? activeSizes : undefined,
    page: overrides.page ?? listing.page,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const colorFilters = parseSearchParamArray(searchParams["color"]);
  const sizeFilters = parseSearchParamArray(searchParams["size"]);
  const page = parsePageParam(searchParams["page"]);

  const listing = await getProductListing({
    page,
    pageSize: PAGE_SIZE,
    colorFilters,
    sizeFilters,
  });

  const basePath = "/collections";
  const previousQuery = listing.hasPreviousPage
    ? buildProductListingQuery(listing, { page: listing.page - 1 })
    : null;
  const nextQuery = listing.hasNextPage
    ? buildProductListingQuery(listing, { page: listing.page + 1 })
    : null;

  return (
    <main className="container-page">
      <header className="space-y-3">
        <p className="text-sm font-medium tracking-wide text-emerald-700">
          Sản phẩm
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
          Khám phá bộ sưu tập OnlyPerf
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Lọc theo màu sắc và kích thước để tìm cây vợt phù hợp với phong cách
          chơi của bạn.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <ProductsFilterPanel
          colors={listing.filters.colors}
          sizes={listing.filters.sizes}
        />

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                {listing.total} sản phẩm
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Trang {listing.page} trên {listing.totalPages}
              </p>
            </div>
          </div>

          {listing.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white/50 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
              Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại. Hãy thử điều
              chỉnh lại màu sắc hoặc kích thước.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listing.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <nav className="flex items-center justify-between pt-4 text-sm">
            {listing.hasPreviousPage ? (
              <Link
                href={`${basePath}${previousQuery ?? ""}`}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                ← Trang trước
              </Link>
            ) : (
              <span className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
                ← Trang trước
              </span>
            )}

            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Trang {listing.page} / {listing.totalPages}
            </span>

            {listing.hasNextPage ? (
              <Link
                href={`${basePath}${nextQuery ?? ""}`}
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Trang tiếp theo →
              </Link>
            ) : (
              <span className="rounded-md border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
                Trang tiếp theo →
              </span>
            )}
          </nav>
        </section>
      </div>
    </main>
  );
}
