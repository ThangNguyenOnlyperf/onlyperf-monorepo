import type {
  CountryCode,
  LanguageCode,
} from "@shopify/hydrogen-react/storefront-api-types";

export interface Locale {
  country: CountryCode;
  language: LanguageCode;
  currency?: string;
}

export interface LocalizationContext {
  locale: Locale;
  availableLocales: Locale[];
  defaultLocale: Locale;
}

export const EN_US_LOCALE: Locale = {
  country: "US",
  language: "EN",
};

export const PRIMARY_LOCALE: Locale = {
  country: "VN",
  language: "VI",
};

export const SUPPORTED_LOCALES: Locale[] = [
  EN_US_LOCALE,
  PRIMARY_LOCALE, // Vietnamese (Vietnam) - primary market
  { country: "US", language: "ES" }, // Spanish (United States)
  { country: "GB", language: "EN" }, // English (United Kingdom)
  { country: "CA", language: "EN" }, // English (Canada)
  { country: "CA", language: "FR" }, // French (Canada)
  { country: "AU", language: "EN" }, // English (Australia)
  { country: "FR", language: "FR" }, // French (France)
  { country: "DE", language: "DE" }, // German (Germany)
  { country: "JP", language: "JA" }, // Japanese (Japan)
];

/**
 * Parses an Accept-Language header and extracts the most suitable locale
 */
export function parseAcceptLanguageHeader(
  acceptLanguage: string | null,
): Locale | null {
  if (!acceptLanguage) return null;

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q = "1"] = lang.trim().split(";q=");
      return { code: code.trim(), quality: parseFloat(q) };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    const languageCode = code.split("-")[0].toUpperCase() as LanguageCode;
    const countryCode = code.includes("-")
      ? (code.split("-")[1].toUpperCase() as CountryCode)
      : null;

    // Try exact match first
    const exactMatch = SUPPORTED_LOCALES.find(
      (locale) =>
        locale.language === languageCode &&
        (!countryCode || locale.country === countryCode),
    );
    if (exactMatch) return exactMatch;

    // Try language match only
    const languageMatch = SUPPORTED_LOCALES.find(
      (locale) => locale.language === languageCode,
    );
    if (languageMatch) return languageMatch;
  }

  return null;
}

/**
 * Parses locale from URL query parameter
 */
export function parseLocaleFromParams(
  params: Record<string, string | string[] | undefined>,
): Locale | null {
  const localeParam = typeof params.locale === "string" ? params.locale : null;
  if (!localeParam) return null;

  // Support formats: "en-US", "en-us", "en", "US", "us"
  const parts = localeParam.split("-");

  if (parts.length === 2) {
    const language = parts[0].toUpperCase() as LanguageCode;
    const country = parts[1].toUpperCase() as CountryCode;

    const match = SUPPORTED_LOCALES.find(
      (locale) => locale.language === language && locale.country === country,
    );
    if (match) return match;
  }

  // Try language only
  const language = localeParam.toUpperCase() as LanguageCode;
  const match = SUPPORTED_LOCALES.find(
    (locale) => locale.language === language,
  );
  if (match) return match;

  // Try country only
  const country = localeParam.toUpperCase() as CountryCode;
  const countryMatch = SUPPORTED_LOCALES.find(
    (locale) => locale.country === country,
  );
  if (countryMatch) return countryMatch;

  return null;
}

/**
 * Gets locale from cookies if set
 */
export function parseLocaleFromCookies(
  cookies: Record<string, string>,
): Locale | null {
  const localeCookie = cookies["shopify-locale"];
  if (!localeCookie) return null;

  try {
    const parsed = JSON.parse(localeCookie) as Locale;

    // Validate that the locale is supported
    const match = SUPPORTED_LOCALES.find(
      (locale) =>
        locale.country === parsed.country &&
        locale.language === parsed.language,
    );
    return match || null;
  } catch {
    return null;
  }
}

/**
 * Detects the best locale based on available information
 */
export function detectLocale(request: {
  headers?: Record<string, string>;
  params?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
}): Locale {
  const { headers = {}, params = {}, cookies = {} } = request;

  // 1. Check URL parameter first (explicit user choice)
  const urlLocale = parseLocaleFromParams(params);
  if (urlLocale) return urlLocale;

  // 2. Check cookie (saved preference)
  const cookieLocale = parseLocaleFromCookies(cookies);
  if (cookieLocale) return cookieLocale;
  return PRIMARY_LOCALE;
}

/**
 * Formats locale for Shopify @inContext directive
 */
export function formatLocaleForInContext(locale: Locale): string {
  return `{ country: ${locale.country}, language: ${locale.language} }`;
}

/**
 * Gets locale string for display purposes
 */
export function getLocaleString(locale: Locale): string {
  return `${locale.language.toLowerCase()}-${locale.country.toLowerCase()}`;
}

/**
 * Validates if a locale is supported
 */
export function isSupportedLocale(locale: Locale): boolean {
  return SUPPORTED_LOCALES.some(
    (supported) =>
      supported.country === locale.country &&
      supported.language === locale.language,
  );
}

/**
 * Gets the most appropriate locale from country code
 */
export function getLocaleFromCountry(countryCode: CountryCode): Locale {
  const match = SUPPORTED_LOCALES.find(
    (locale) => locale.country === countryCode,
  );
  return match || PRIMARY_LOCALE;
}

/**
 * Server-side utility to extract locale information from Next.js request objects
 * This eliminates code duplication in server components that need locale detection
 */
export async function getServerLocale(request: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  cookies?: Promise<any>;
  headers?: Promise<any>;
}): Promise<{ locale: Locale; buyerIp: string }> {
  const resolvedSearchParams =
    (await request.searchParams?.then((params) => params || {})) ?? {};
  const cookieStore = (await request.cookies?.then((store) => store)) ?? {
    get: () => null,
  };
  const requestHeaders = (await request.headers?.then(
    (headers) => headers,
  )) ?? { get: () => null };

  const cookiesRecord: Record<string, string> = {};
  if (cookieStore) {
    if (typeof cookieStore.getAll === "function") {
      const allCookies = cookieStore.getAll();
      if (Array.isArray(allCookies)) {
        allCookies.forEach((cookie) => {
          cookiesRecord[cookie.name] = cookie.value;
        });
      }
    } else if (typeof cookieStore.get === "function") {
      const localeCookie = cookieStore.get("shopify-locale");
      if (localeCookie) {
        cookiesRecord["shopify-locale"] = localeCookie.value;
      }
    }
  }

  const headersRecord: Record<string, string> = {};
  if (requestHeaders) {
    if (typeof requestHeaders.forEach === "function") {
      requestHeaders.forEach((value: string, key: string) => {
        headersRecord[key] = value;
      });
    } else if (typeof requestHeaders.get === "function") {
      const acceptLanguage = requestHeaders.get("accept-language");
      if (acceptLanguage) {
        headersRecord["accept-language"] = acceptLanguage;
      }
    }
  }

  const xForwardedFor =
    headersRecord["x-forwarded-for"] ||
    (requestHeaders && typeof requestHeaders.get === "function"
      ? requestHeaders.get("x-forwarded-for")
      : "") ||
    "";
  const buyerIp = xForwardedFor.split(",")[0]?.trim() || "";

  const locale = detectLocale({
    params: resolvedSearchParams,
    cookies: cookiesRecord,
    headers: headersRecord,
  });

  return { locale, buyerIp };
}
