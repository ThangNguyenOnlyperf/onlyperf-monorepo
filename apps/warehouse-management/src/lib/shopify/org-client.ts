/**
 * Organization-specific Shopify client factory
 * Creates Shopify API clients using per-org credentials from organizationSettings
 */
import { db } from "~/server/db";
import { organizationSettings } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OrgShopifyConfig {
  enabled: boolean;
  storeDomain: string;
  adminApiAccessToken: string;
  apiVersion: string;
  locationId: string | null;
  webhookSecret: string | null;
}

export class OrgShopifyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly organizationId: string,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "OrgShopifyApiError";
  }
}

/**
 * Get Shopify configuration for an organization
 * Returns null if Shopify is not configured or disabled
 */
export async function getOrgShopifyConfig(organizationId: string): Promise<OrgShopifyConfig | null> {
  const settings = await db.query.organizationSettings.findFirst({
    where: eq(organizationSettings.organizationId, organizationId),
  });

  if (!settings?.shopifyEnabled || !settings.shopifyStoreDomain || !settings.shopifyAdminApiAccessToken) {
    return null;
  }

  return {
    enabled: settings.shopifyEnabled,
    storeDomain: settings.shopifyStoreDomain,
    adminApiAccessToken: settings.shopifyAdminApiAccessToken,
    apiVersion: settings.shopifyApiVersion ?? "2025-04",
    locationId: settings.shopifyLocationId,
    webhookSecret: settings.shopifyWebhookSecret,
  };
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

interface OrgShopifyGraphqlOptions {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

/**
 * Create a Shopify client bound to a specific organization's credentials
 */
export function createOrgShopifyClient(config: OrgShopifyConfig, organizationId: string) {
  const sanitizedDomain = config.storeDomain.replace(/^https?:\/\//, "");
  const apiBaseUrl = `https://${sanitizedDomain}/admin/api/${config.apiVersion}`;
  const graphqlUrl = `${apiBaseUrl}/graphql.json`;

  /**
   * Make a GraphQL request to Shopify using org-specific credentials
   */
  async function graphqlRequest<T>(options: OrgShopifyGraphqlOptions): Promise<T> {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt += 1;

      const response = await fetch(graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": config.adminApiAccessToken,
        },
        body: JSON.stringify({
          query: options.query,
          variables: options.variables,
          operationName: options.operationName,
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
        throw new OrgShopifyApiError(
          `Shopify responded with status ${response.status}`,
          response.status,
          organizationId,
          payload
        );
      }

      if (payload.errors?.length) {
        throw new OrgShopifyApiError(
          payload.errors.map((err) => err.message).join("; "),
          response.status,
          organizationId,
          payload
        );
      }

      if (!payload.data) {
        throw new OrgShopifyApiError(
          "Shopify response did not include data",
          response.status,
          organizationId,
          payload
        );
      }

      return payload.data;
    }

    throw new OrgShopifyApiError("Exceeded Shopify retry attempts", 500, organizationId);
  }

  /**
   * Make a REST request to Shopify using org-specific credentials
   */
  async function restRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const targetPath = path.startsWith("/") ? path.slice(1) : path;
    const url = `${apiBaseUrl}/${targetPath}`;

    const response = await fetch(url, {
      method: init?.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.adminApiAccessToken,
        ...(init?.headers ?? {}),
      },
      body: init?.body,
    });

    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const errorMessage = extractRestError(payload);
      throw new OrgShopifyApiError(
        errorMessage ?? `Shopify REST request failed with status ${response.status}`,
        response.status,
        organizationId,
        payload
      );
    }

    return payload as T;
  }

  return {
    config,
    organizationId,
    graphqlRequest,
    restRequest,
    apiBaseUrl,
    graphqlUrl,
  };
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

export type OrgShopifyClient = ReturnType<typeof createOrgShopifyClient>;
