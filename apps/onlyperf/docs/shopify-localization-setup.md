# Shopify Localization Setup Guide

This guide explains how to set up and use Shopify localization in this Next.js e-commerce application. The system supports automatic locale detection, localized content fetching, and a seamless user experience across multiple languages and countries.

## Quick Start for Developers

### Server Components

For server components (like pages), use the built-in `getServerLocale` utility:

```tsx
import { getServerLocale } from "@/lib/shopify/locale";
import { getProducts } from "@/lib/shopify/storefront";

export default async function ProductsPage() {
  const { locale } = await getServerLocale({
    searchParams, // from page props
    cookies: cookies(),
    headers: headers(),
  });

  const products = await getProducts({}, locale);
  // Products will be localized!
}
```

### Client Components

For client components, use the locale context:

```tsx
"use client";

import { useLocale } from "@/contexts/LocaleContext";

export function MyComponent() {
  const { locale, setLocale } = useLocale();
  
  return (
    <div>
      <p>Current: {locale.country}-{locale.language}</p>
      <button onClick={() => setLocale({ country: "US", language: "EN" })}>
        Switch to English
      </button>
    </div>
  );
}
```

## Supported Locales

| Country | Language | Code | Currency |
|---------|----------|------|----------|
| United States | English | US-EN | USD |
| Vietnam | Vietnamese | VN-VI | VND |
| United Kingdom | English | GB-EN | GBP |
| Canada | English | CA-EN | CAD |
| Canada | French | CA-FR | CAD |
| France | French | FR-FR | EUR |
| Germany | German | DE-DE | EUR |
| Australia | English | AU-EN | AUD |
| Japan | Japanese | JP-JA | JPY |

## How It Works

### Locale Detection Priority

1. **URL Parameter** (`?locale=en-US`)
2. **Cookie** (`shopify-locale`)
3. **Accept-Language Header**
4. **Default Locale** (VN-VI for this store)

### Shopify Integration

All Shopify queries automatically use the `@inContext` directive when you pass a locale:

```tsx
// This automatically adds @inContext(country: US, language: EN)
const products = await getProducts({}, { country: "US", language: "EN" });
```

## Available Utilities

### `getServerLocale(request)`

**Purpose**: Server-side locale detection
**Use**: In Next.js server components

```tsx
const { locale, buyerIp } = await getServerLocale({
  searchParams: searchParamsPromise,
  cookies: cookies(),
  headers: headers(),
});
```

### `detectLocale(request)`

**Purpose**: Manual locale detection
**Use**: When you need custom detection logic

```tsx
const locale = detectLocale({
  headers: { "accept-language": "en-US,en;q=0.9" },
  cookies: { "shopify-locale": '{"country":"US","language":"EN"}' },
  params: { locale: "en-US" },
});
```

### `useLocale()`

**Purpose**: Client-side locale access
**Use**: In React client components

```tsx
const { locale, setLocale, availableLocales } = useLocale();
```

## Shopify Setup

### 1. Install Translate & Adapt App

1. Go to Shopify App Store
2. Install "Translate & Adapt" by Shopify
3. Follow the setup instructions

### 2. Configure Markets

1. Go to **Settings** → **Markets**
2. Add target markets (countries)
3. Configure pricing and currencies
4. Set up domains if needed

### 3. Translate Content

Using Translate & Adapt, translate:
- Collection titles and descriptions
- Product titles and descriptions
- Variant options
- Custom metafields

## Testing Localization

### URL Parameters

```
/collections?locale=en-US    # English (US)
/collections?locale=vi-VN    # Vietnamese (Vietnam)
/collections?locale=fr-FR    # French (France)
```

### Browser Testing

1. **Cookie Method**: Set `shopify-locale` cookie to `{"country":"US","language":"EN"}`
2. **Header Method**: Use browser extensions to modify Accept-Language header
3. **URL Method**: Add `?locale=en-US` to any page

### Expected Behavior

- Collection titles should be translated
- Product information should be localized
- Prices should show in local currency
- URLs should maintain locale preference

## Common Patterns

### New Query Functions

When creating new Shopify query functions, always accept an optional locale:

```tsx
export async function getCustomData(
  options: CustomOptions = {},
  locale?: Locale,
): Promise<CustomResult> {
  const data = await storefrontQuery<CUSTOM_QUERY>(CUSTOM_QUERY, {
    variables: {
      country: locale?.country,
      language: locale?.language,
      ...otherVariables,
    },
    locale, // This adds @inContext automatically
  });
  
  return data;
}
```

### Using in Server Components

```tsx
export default async function MyPage() {
  const { locale } = await getServerLocale({
    searchParams,
    cookies: cookies(),
    headers: headers(),
  });
  
  const data = await getCustomData({}, locale);
  
  // Use data.localizedCollectionTitle instead of hardcoded strings
  return <h1>{data.localizedCollectionTitle}</h1>;
}
```

## Troubleshooting

### Content Not Localized

1. Check Shopify Admin → Translate & Adapt for translations
2. Verify `@inContext` is being applied (check network tab)
3. Test with different locales using `?locale=en-US`

### Wrong Locale Detected

1. Clear `shopify-locale` cookie
2. Check for conflicting locale sources
3. Test with explicit URL parameter

### GraphQL Errors

1. Verify API token has localization permissions
2. Check that country/language codes are valid
3. Test query in Shopify GraphQL Playground

## Performance Considerations

- Shopify automatically caches localized content
- Server-side detection prevents client-side flicker
- Use proper caching headers for locale-specific content

## Support

For Shopify-related issues:
- Contact Shopify Support for API problems
- Use Translate & Adapt support for translation issues
- Check this documentation for technical questions

## Related Files

- `/src/lib/shopify/locale.ts` - Core locale utilities
- `/src/lib/shopify/client.ts` - Shopify client with @inContext support
- `/src/contexts/LocaleContext.tsx` - Client-side locale state
- `/src/app/layout.tsx` - Server-side locale detection setup