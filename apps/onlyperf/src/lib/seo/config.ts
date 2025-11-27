/**
 * SEO Configuration for OnlyPerf
 * Central place for all SEO-related constants and metadata
 */

export const SEO_CONFIG = {
  siteName: "OnlyPerf",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com",
  defaultLocale: "vi-VN",
  supportedLocales: ["vi-VN", "en-US", "th-TH", "id-ID"], // Vietnam + SEA

  // Default metadata
  defaultTitle: "OnlyPerf - Thời trang thể thao cao cấp",
  defaultDescription:
    "OnlyPerf cung cấp các sản phẩm thời trang thể thao chất lượng cao, thiết kế hiện đại và giá cả cạnh tranh. Mua sắm quần áo, giày dép và phụ kiện thể thao.",
  defaultKeywords: [
    "thời trang thể thao",
    "quần áo tập gym",
    "giày chạy bộ",
    "phụ kiện thể thao",
    "sportswear Vietnam",
  ],

  // Open Graph defaults
  ogImage: {
    url: "/images/og-default.jpg",
    width: 1200,
    height: 630,
    alt: "OnlyPerf - Thời trang thể thao cao cấp",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image" as const,
    site: "@onlyperf", // Update with your actual Twitter handle
    creator: "@onlyperf",
  },

  // Business information for structured data
  organization: {
    name: "OnlyPerf",
    legalName: "OnlyPerf Co., Ltd.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com",
    logo: "/images/logo.png",
    foundingDate: "2024",
    email: "info@onlyperf.com", // Update with your email
    telephone: "+84-xxx-xxx-xxx", // Update with your phone
    address: {
      streetAddress: "123 Street Name", // Update with your address
      addressLocality: "Ho Chi Minh City",
      addressRegion: "HCM",
      postalCode: "700000",
      addressCountry: "VN",
    },
    socialMedia: [
      "https://facebook.com/onlyperf",
      "https://instagram.com/onlyperf",
      "https://tiktok.com/@onlyperf",
    ],
  },

  // Breadcrumb settings
  breadcrumb: {
    homeLabel: "Trang chủ",
    productsLabel: "Sản phẩm",
  },
} as const;

/**
 * Generate canonical URL for a given path
 */
export function getCanonicalUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SEO_CONFIG.siteUrl}${cleanPath}`;
}

/**
 * Generate alternate URLs for different locales
 */
export function getAlternateUrls(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return SEO_CONFIG.supportedLocales.map((locale) => ({
    hrefLang: locale.toLowerCase(),
    href: `${SEO_CONFIG.siteUrl}${cleanPath}?locale=${locale}`,
  }));
}

/**
 * Format price for structured data
 */
export function formatPriceForSchema(price: number, currency = "VND"): string {
  return price.toFixed(2);
}

/**
 * Get currency based on locale
 */
export function getCurrencyByLocale(locale: string): string {
  const currencyMap: Record<string, string> = {
    "vi-VN": "VND",
    "en-US": "USD",
    "th-TH": "THB",
    "id-ID": "IDR",
  };
  return currencyMap[locale] || "VND";
}
