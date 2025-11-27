import Image from "next/image";
import Link from "next/link";

import { cn } from "@/components/lib/utils";
import type {
  CatalogSortHandle,
  StorefrontCollectionSummary,
} from "@/lib/shopify/storefront";

interface CategoryNavProps {
  categories: StorefrontCollectionSummary[];
  activeHandle?: string | null;
  sort?: CatalogSortHandle | null;
  basePath?: string;
}

function buildCategoryHref({
  basePath,
  handle,
  sort,
}: {
  basePath: string;
  handle: string | null;
  sort?: CatalogSortHandle | null;
}): string {
  const path = handle ? `${basePath}/${handle}` : basePath;
  if (!sort || sort === "recommended") {
    return path;
  }
  const params = new URLSearchParams({ sort });
  return `${path}?${params.toString()}`;
}

export function CategoryNav({
  categories,
  activeHandle = null,
  sort,
  basePath = "/collections",
}: CategoryNavProps) {
  const tiles: Array<{
    key: string;
    title: string;
    handle: string | null;
    imageUrl: string | null;
    imageAlt: string;
  }> = [
    ...categories.map((category) => ({
      key: category.id,
      title: category.title,
      handle: category.handle,
      imageUrl: category.image?.url ?? null,
      imageAlt: category.image?.altText ?? category.title,
    })),
  ];

  return (
    <nav aria-label="Danh mục sản phẩm" className="space-y-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Danh mục
      </h2>
      <div className="flex snap-x gap-6 overflow-x-auto pb-4 sm:gap-8 lg:gap-10">
        {tiles.map((tile) => {
          const isActive = tile.handle === activeHandle;
          const href = buildCategoryHref({
            basePath,
            handle: tile.handle,
            sort,
          });

          return (
            <div
              key={tile.title}
              className="group relative flex flex-col shrink-0 snap-start flex-col items-start gap-3"
            >
              <div
                className={cn(
                  "p-1 transition-all duration-200",
                  isActive
                    ? "border-2 border-black bg-white"
                    : "border-2 border-transparent hover:border-zinc-300 focus-within:border-zinc-300",
                )}
              >
                <Link
                  key={tile.key}
                  href={href}
                  className="w-[125px] h-[170px] flex shrink-0 snap-start flex-col items-center gap-3 text-left"
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="relative flex w-full h-full items-center justify-center overflow-hidden border border-zinc-200 bg-[#f5f5f5] p-6 transition-all duration-200 ease-out">
                    {tile.imageUrl ? (
                      <Image
                        src={tile.imageUrl}
                        alt={tile.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 220px, (min-width: 640px) 200px, 170px"
                        className="h-full w-full object-cover w-[125px] h-[170px]"
                        priority={tile.handle === activeHandle}
                        fetchPriority="high"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-100 to-zinc-200 text-xs font-small text-zinc-500">
                        {tile.title}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
              <span
                className={cn(
                  "font-medium text-xs tracking-tight text-zinc-700 transition-colors duration-200",
                  isActive ? "text-zinc-900" : "group-hover:text-zinc-900",
                )}
              >
                {tile.title}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
