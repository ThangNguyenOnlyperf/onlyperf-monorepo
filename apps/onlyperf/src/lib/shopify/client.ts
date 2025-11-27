import { createStorefrontClient } from "@shopify/hydrogen-react";

import { getShopifyPublicConfig } from "./config";
import {
  ShopifyAPIError,
  ShopifyNetworkError,
  ShopifyTimeoutError,
} from "./error-types";
import type { Locale } from "./locale";

export type StorefrontQueryOptions = {
  variables?: Record<string, unknown>;
  locale?: Locale;
  withInContext?: boolean;
  buyerIp?: string;
};

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

function getStorefrontClient() {
  const config = getShopifyPublicConfig();
  const privateStorefrontToken =
    process.env.SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN;

  if (!privateStorefrontToken) {
    throw new Error(
      "Missing environment variable: SHOPIFY_PRIVATE_STOREFRONT_API_TOKEN",
    );
  }

  return createStorefrontClient({
    storeDomain: config.storeDomain,
    storefrontApiVersion: config.storefrontApiVersion,
    privateStorefrontToken,
    publicStorefrontToken: config.storefrontToken,
  });
}

function addInContextDirective(
  query: string,
  locale: Locale | undefined,
): string {
  if (!locale) return query;

  const inContextDirective = `@inContext(country: ${locale.country}, language: ${locale.language})`;

  // Skip localization queries
  if (query.includes("localization {")) {
    return query;
  }

  // Apply @inContext to query/mutation definitions
  return query.replace(
    /(query|mutation)\s+(\w+)(\s*\([^)]*\))?\s*\{/g,
    (match, operation, name, variables) => {
      if (match.includes("@inContext")) return match;
      const variablesPart = variables || "";
      return `${operation} ${name}${variablesPart} ${inContextDirective} {`;
    },
  );
}

export async function storefrontQuery<T>(
  query: string,
  {
    variables,
    locale,
    withInContext = true,
    buyerIp,
  }: StorefrontQueryOptions = {},
): Promise<T> {
  const client = getStorefrontClient();

  const localizedQuery =
    withInContext && locale ? addInContextDirective(query, locale) : query;

  const queryVariables = {
    ...variables,
    ...(locale && {
      country: locale.country,
      language: locale.language,
    }),
  };

  const requestBody = JSON.stringify({
    query: localizedQuery,
    variables: queryVariables,
  });

  const controller = new AbortController();
  const timeoutMs = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(client.getStorefrontApiUrl(), {
      method: "POST",
      headers: {
        ...client.getPrivateTokenHeaders(),
        // Add headers for better localization support
        ...(locale && {
          "Accept-Language": `${locale.language.toLowerCase()}-${locale.country.toLowerCase()}`,
        }),
        // Add buyer IP if available
        ...(buyerIp && {
          "X-Forwarded-For": buyerIp,
        }),
      },
      body: requestBody,
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new ShopifyTimeoutError(
        "Kết nối đến Shopify quá lâu, vui lòng thử lại",
        "storefrontQuery",
        timeoutMs,
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("Connect Timeout"))
    ) {
      throw new ShopifyNetworkError(
        "Không thể kết nối đến Shopify, vui lòng thử lại sau",
        error,
      );
    }

    // Re-throw other errors
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ShopifyAPIError(
      `Storefront API request failed: ${response.status} ${response.statusText}`,
      response.status,
      "storefrontQuery",
    );
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  // Handle GraphQL errors with more detailed information
  if (payload.errors?.length) {
    const errorMessages = payload.errors.map((error) => {
      let message = error.message;

      // Check for common GraphQL syntax errors
      if (
        message.includes("Expected LCURLY") ||
        message.includes("Expected LPAREN")
      ) {
        message = `GraphQL Syntax Error: ${message}. This may be due to incorrect @inContext directive placement.`;
      }

      if (message.includes("Cannot query field")) {
        message = `GraphQL Field Error: ${message}. This field may not exist in the schema.`;
      }

      return message;
    });

    // Include the problematic query for debugging (only in development)
    const debugInfo =
      process.env.NODE_ENV === "development"
        ? `\n\nQuery:\n${localizedQuery}\n\nVariables:\n${JSON.stringify(queryVariables, null, 2)}`
        : "";

    throw new ShopifyAPIError(
      `GraphQL errors: ${errorMessages.join("; ")}${debugInfo}`,
      undefined,
      "storefrontQuery",
      payload.errors,
    );
  }

  if (!payload.data) {
    throw new ShopifyAPIError(
      "Storefront API response was missing a data payload",
      undefined,
      "storefrontQuery",
    );
  }

  return payload.data;
}

/**
 * Creates a localized query function for a specific locale
 */
export function createLocalizedStorefrontQuery(locale: Locale) {
  return <T>(
    query: string,
    options: Omit<StorefrontQueryOptions, "locale"> = {},
  ) => storefrontQuery<T>(query, { ...options, locale, withInContext: true });
}
