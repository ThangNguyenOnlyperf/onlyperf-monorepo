import type { Metadata } from "next";
import { CategoryNav, SortControl, VariantCard } from "@/components/catalog";
import {
  CATALOG_SORT_OPTIONS,
  getCatalogListing,
} from "@/lib/shopify/storefront";
import { parseSortParam } from "./common";
import { getServerLocale, PRIMARY_LOCALE } from "@/lib/shopify/locale";
import { cookies, headers } from "next/headers";
import {
  generatePageMetadata,
  generateBreadcrumbSchema,
  JsonLd,
} from "@/lib/seo";

export const revalidate = 3600;

interface ProductsV2PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata({
    title: "Tất cả sản phẩm",
    description:
      "Khám phá toàn bộ sản phẩm thời trang thể thao tại OnlyPerf. Quần áo, giày dép và phụ kiện thể thao chất lượng cao với giá cả cạnh tranh.",
    keywords: [
      "sản phẩm thể thao",
      "mua đồ thể thao",
      "quần áo gym",
      "giày thể thao",
      "phụ kiện tập luyện",
    ],
    path: "/collections",
  });
}

export default async function ProductsV2Page({
  searchParams,
}: ProductsV2PageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = parseSortParam(resolvedSearchParams?.sort);

  const { buyerIp } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });

  const locale = PRIMARY_LOCALE;

  const listing = await getCatalogListing({ sort, locale, buyerIp });

  if (!listing) {
    return null;
  }

  // Breadcrumb structured data
  const breadcrumbSchema = generateBreadcrumbSchema([
    {
      name: "Trang chủ",
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com",
    },
    {
      name: "Sản phẩm",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com"}/collections`,
    },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <main className="container-page">
        <header className="space-y-3">
          <p className="text-sm font-medium tracking-wide text-emerald-700">
            Bộ sưu tập
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
            {listing.heading}
          </h1>
          {listing.description && (
            <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              {listing.description}
            </p>
          )}
        </header>

        <CategoryNav
          categories={listing.categories}
          activeHandle={listing.activeCollection?.handle ?? null}
          sort={sort}
        />

        <div className="flex items-center justify-end">
          <SortControl options={CATALOG_SORT_OPTIONS} current={sort} />
        </div>

        {listing.variants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
            Hiện chưa có sản phẩm nào trong danh mục này.
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listing.variants.map(({ product, variant }) => (
              <VariantCard
                key={variant.id}
                product={product}
                variant={variant}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
