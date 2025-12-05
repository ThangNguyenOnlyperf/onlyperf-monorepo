import { env } from "~/env";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

/**
 * @deprecated Use org-client.ts instead for per-organization Shopify config.
 * This global client is only kept for backwards compatibility with fulfillment.ts
 */
function getShopifyUrls() {
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
    throw new ShopifyApiError(
      "Global Shopify env vars (SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_ACCESS_TOKEN) not configured. " +
      "Configure per-org settings in Settings > Shopify instead.",
      500
    );
  }
  const sanitizedDomain = env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, "");
  const apiBaseUrl = `https://${sanitizedDomain}/admin/api/${env.SHOPIFY_API_VERSION}`;
  const shopifyGraphqlUrl = `${apiBaseUrl}/graphql.json`;
  return { apiBaseUrl, shopifyGraphqlUrl };
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ShopifyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

interface ShopifyGraphqlOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

export async function shopifyGraphqlRequest<T>({
  query,
  variables,
  operationName,
}: ShopifyGraphqlOptions): Promise<T> {
  const { shopifyGraphqlUrl } = getShopifyUrls();
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt += 1;

    const response = await fetch(shopifyGraphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
      },
      body: JSON.stringify({
        query,
        variables,
        operationName,
      }),
    });

    if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : BASE_BACKOFF_MS * attempt ** 2;

      await sleep(delayMs);
      continue;
    }

    const payload = (await response.json()) as GraphQLResponse<T>;

    if (!response.ok) {
      throw new ShopifyApiError(
        `Shopify responded with status ${response.status}`,
        response.status,
        payload
      );
    }

    if (payload.errors?.length) {
      throw new ShopifyApiError(
        payload.errors.map((err) => err.message).join("; "),
        response.status,
        payload
      );
    }

    if (!payload.data) {
      throw new ShopifyApiError("Shopify response did not include data", response.status, payload);
    }

    return payload.data;
  }

  throw new ShopifyApiError("Exceeded Shopify retry attempts", 500);
}

export async function shopifyRestRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const { apiBaseUrl } = getShopifyUrls();
  const targetPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${apiBaseUrl}/${targetPath}`;

  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_API_ACCESS_TOKEN!,
      ...(init?.headers ?? {}),
    },
    body: init?.body,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const errorMessage = extractRestError(payload);
    throw new ShopifyApiError(
      errorMessage ?? `Shopify REST request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return payload as T;
}

function extractRestError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.errors === "string") {
    return record.errors;
  }

  if (record.errors && typeof record.errors === "object") {
    const entries = Object.entries(record.errors as Record<string, unknown>);
    return entries
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("; ");
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  return null;
}
