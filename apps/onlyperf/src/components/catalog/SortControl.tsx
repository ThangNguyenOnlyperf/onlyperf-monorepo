"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { startTransition, useCallback } from "react";

import type { CatalogSortHandle } from "@/lib/shopify/storefront";

interface SortControlProps {
  options: Array<{ value: CatalogSortHandle; label: string }>;
  current: CatalogSortHandle;
}

export function SortControl({ options, current }: SortControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextSort = event.target.value as CatalogSortHandle;
      const params = new URLSearchParams(searchParams?.toString());

      if (!nextSort || nextSort === "recommended") {
        params.delete("sort");
      } else {
        params.set("sort", nextSort);
      }

      const queryString = params.toString();
      const href = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.replace(href);
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <label className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="whitespace-nowrap font-medium text-zinc-900 dark:text-white">
        Sắp xếp theo
      </span>
      <select
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        value={current}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
