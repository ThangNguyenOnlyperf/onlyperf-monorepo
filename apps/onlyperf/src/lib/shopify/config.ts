import type {
  CountryCode,
  LanguageCode,
} from "@shopify/hydrogen-react/storefront-api-types";

export interface ShopifyPublicConfig {
  storeDomain: string;
  storefrontToken: string;
  storefrontApiVersion: string;
  countryIsoCode: CountryCode;
  languageIsoCode: LanguageCode;
}

const DEFAULT_COUNTRY_CODE: CountryCode = "VN";
const DEFAULT_LANGUAGE_CODE: LanguageCode = "VI";

function assertEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function sanitizeStoreDomain(storeDomain: string): string {
  return storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getShopifyPublicConfig(): ShopifyPublicConfig {
  const storeDomain = sanitizeStoreDomain(
    assertEnv(process.env.NEXT_PUBLIC_STORE_DOMAIN, "NEXT_PUBLIC_STORE_DOMAIN"),
  );

  return {
    storeDomain,
    storefrontToken: assertEnv(
      process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN,
      "SHOPIFY_STOREFRONT_API_ACCESS_TOKEN",
    ),
    storefrontApiVersion: assertEnv(
      process.env.SHOPIFY_API_VERSION,
      "SHOPIFY_API_VERSION",
    ),
    countryIsoCode:
      (process.env.SHOPIFY_COUNTRY_CODE as CountryCode) ?? DEFAULT_COUNTRY_CODE,
    languageIsoCode:
      (process.env.SHOPIFY_LANGUAGE_CODE as LanguageCode) ??
      DEFAULT_LANGUAGE_CODE,
  };
}
