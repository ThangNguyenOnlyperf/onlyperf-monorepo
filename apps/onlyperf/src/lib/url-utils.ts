/**
 * URL parsing and query string utilities
 */

export function parseSearchParamArray(
  value: string | string[] | undefined,
): string[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export interface QueryStringOptions {
  colors?: string[];
  sizes?: string[];
  page?: number;
}

export function buildQueryString(options: QueryStringOptions): string {
  const params = new URLSearchParams();

  if (options.colors?.length) {
    params.set("color", options.colors.join(","));
  }

  if (options.sizes?.length) {
    params.set("size", options.sizes.join(","));
  }

  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}
