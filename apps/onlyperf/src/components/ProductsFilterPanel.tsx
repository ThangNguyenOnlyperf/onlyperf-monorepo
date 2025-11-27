"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type { ProductFilterOption } from "../lib/shopify/storefront";

interface ProductsFilterPanelProps {
  colors: ProductFilterOption[];
  sizes: ProductFilterOption[];
}

type FilterType = "color" | "size";

type ToggleFilterFn = (type: FilterType, token: string) => void;

function useFilterNavigation(): [ToggleFilterFn, () => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleFilter: ToggleFilterFn = (type, token) => {
    const params = new URLSearchParams(searchParams?.toString());
    const key = type === "color" ? "color" : "size";
    const values = new Set(
      params
        .get(key)
        ?.split(",")
        .map((value) => value.trim())
        .filter((value): value is string => Boolean(value)) ?? [],
    );

    if (values.has(token)) {
      values.delete(token);
    } else {
      values.add(token);
    }

    params.delete("page");

    if (values.size) {
      params.set(key, Array.from(values).join(","));
    } else {
      params.delete(key);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("color");
    params.delete("size");
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return [toggleFilter, clearFilters];
}

export function ProductsFilterPanel({
  colors,
  sizes,
}: ProductsFilterPanelProps) {
  const [toggleFilter, clearFilters] = useFilterNavigation();

  const hasActiveFilters = useMemo(
    () =>
      colors.some((filter) => filter.isActive) ||
      sizes.some((filter) => filter.isActive),
    [colors, sizes],
  );

  return (
    <aside className="h-max space-y-6 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm shadow-zinc-200/40 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/20">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Bộ lọc
          </p>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Thu gọn sản phẩm
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Xóa tất cả
          </button>
        )}
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Màu sắc
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {colors.length} tùy chọn
          </span>
        </div>
        {colors.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Chưa có màu để lọc.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const baseClasses = color.swatchColor
                ? "flex h-10 w-10 items-center justify-center rounded-full border transition"
                : "inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition";
              const activeClasses = color.swatchColor
                ? "border-black ring-2 ring-black ring-offset-2 ring-offset-white dark:border-white dark:ring-white dark:ring-offset-zinc-900"
                : "border-black bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black";
              const inactiveClasses = color.swatchColor
                ? "border-transparent hover:border-zinc-400 dark:hover:border-zinc-600"
                : "border-transparent bg-zinc-200/60 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700";

              return (
                <div
                  key={color.token}
                  className="flex flex-col items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => toggleFilter("color", color.token)}
                    aria-pressed={color.isActive}
                    title={`${color.label} (${color.count})`}
                    className={`${baseClasses} ${color.isActive ? activeClasses : inactiveClasses}`}
                  >
                    {color.swatchColor ? (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white shadow-sm"
                        style={{
                          backgroundColor: color.swatchColor ?? "#d1d5db",
                        }}
                      >
                        <span className="sr-only">{color.label}</span>
                      </span>
                    ) : (
                      <span>{color.label}</span>
                    )}
                  </button>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {color.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Kích thước
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {sizes.length} tùy chọn
          </span>
        </div>
        {sizes.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Chưa có kích thước để lọc.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const activeClasses =
                "border-black bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black";
              const inactiveClasses =
                "border-transparent bg-zinc-200/60 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700";

              return (
                <button
                  key={size.token}
                  type="button"
                  onClick={() => toggleFilter("size", size.token)}
                  aria-pressed={size.isActive}
                  className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white ${size.isActive ? activeClasses : inactiveClasses}`}
                  title={`${size.label} (${size.count})`}
                >
                  <span>{size.label}</span>
                  <span className="ml-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {size.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </aside>
  );
}
