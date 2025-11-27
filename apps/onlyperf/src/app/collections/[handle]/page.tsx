import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryNav, SortControl, VariantCard } from "@/components/catalog";
import {
  CATALOG_SORT_OPTIONS,
  getCatalogListing,
} from "@/lib/shopify/storefront";
import { parseSortParam } from "../common";
import { getServerLocale, PRIMARY_LOCALE } from "@/lib/shopify/locale";
import { cookies, headers } from "next/headers";
import {
  generateCollectionMetadata,
  generateBreadcrumbSchema,
  generateCollectionSchema,
  JsonLd,
} from "@/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { getCatalogCollections } = await import("@/lib/shopify/storefront");

  try {
    const collections = await getCatalogCollections({
      language: "VI",
      country: "VN",
    });

    return collections.map((collection) => ({
      handle: collection.handle,
    }));
  } catch (error) {
    console.error("Failed to generate static params for collections:", error);
    return [];
  }
}

interface ProductsCategoryPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: ProductsCategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;

  const listing = await getCatalogListing({
    categoryHandle: resolvedParams.handle,
    locale: PRIMARY_LOCALE,
  });

  if (!listing || !listing.activeCollection) {
    return {
      title: "Không tìm thấy | OnlyPerf",
    };
  }

  return generateCollectionMetadata({
    collection: {
      title: listing.heading,
      description: listing.description,
      handle: listing.activeCollection.handle,
      image: listing.activeCollection.image,
    },
    productCount: listing.products.length,
  });
}

export default async function ProductsCategoryPage({
  params,
  searchParams,
}: ProductsCategoryPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const sort = parseSortParam(resolvedSearchParams?.sort);

  const { buyerIp } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });

  const listing = await getCatalogListing({
    categoryHandle: resolvedParams.handle,
    sort,
    locale: PRIMARY_LOCALE,
    buyerIp,
  });

  if (!listing) {
    notFound();
  }

  // Structured data
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com";
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: baseUrl },
    { name: "Sản phẩm", url: `${baseUrl}/collections` },
    {
      name: listing.heading,
      url: `${baseUrl}/collections/${resolvedParams.handle}`,
    },
  ]);

  const collectionSchema = listing.activeCollection
    ? generateCollectionSchema({
        title: listing.heading,
        description: listing.description,
        handle: listing.activeCollection.handle,
        products: listing.products,
      })
    : null;

  return (
    <>
      <JsonLd
        data={
          collectionSchema
            ? [breadcrumbSchema, collectionSchema]
            : breadcrumbSchema
        }
      />
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
