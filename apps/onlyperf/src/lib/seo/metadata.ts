/**
 * Metadata generation utilities for Next.js pages
 * Generates comprehensive SEO metadata with Open Graph and Twitter Cards
 */

import type { Metadata } from "next";
import { getAlternateUrls, getCanonicalUrl, SEO_CONFIG } from "./config";

export interface PageMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  path: string;
  noIndex?: boolean;
  locale?: string;
}

/**
 * Generate comprehensive metadata for a page
 */
export function generatePageMetadata(options: PageMetadataOptions): Metadata {
  const {
    title,
    description = SEO_CONFIG.defaultDescription,
    keywords = SEO_CONFIG.defaultKeywords,
    image,
    path,
    noIndex = false,
    locale = SEO_CONFIG.defaultLocale,
  } = options;

  const fullTitle = title
    ? `${title} | ${SEO_CONFIG.siteName}`
    : SEO_CONFIG.defaultTitle;

  const canonicalUrl = getCanonicalUrl(path);
  const alternateUrls = getAlternateUrls(path);

  const ogImage = image || SEO_CONFIG.ogImage;
  const imageUrl = ogImage.url.startsWith("http")
    ? ogImage.url
    : `${SEO_CONFIG.siteUrl}${ogImage.url}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    metadataBase: new URL(SEO_CONFIG.siteUrl),

    // Open Graph
    openGraph: {
      type: "website",
      locale: locale,
      url: canonicalUrl,
      siteName: SEO_CONFIG.siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: ogImage.width || 1200,
          height: ogImage.height || 630,
          alt: ogImage.alt || fullTitle,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: SEO_CONFIG.twitter.card,
      site: SEO_CONFIG.twitter.site,
      creator: SEO_CONFIG.twitter.creator,
      title: fullTitle,
      description,
      images: [imageUrl],
    },

    // Robots
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },

    // Alternates for multi-language
    alternates: {
      canonical: canonicalUrl,
      languages: Object.fromEntries(
        alternateUrls.map((alt) => [alt.hrefLang, alt.href]),
      ),
    },
  };
}

/**
 * Generate metadata for product pages
 */
export interface ProductMetadataOptions {
  product: {
    title: string;
    description: string;
    handle: string;
    featuredImage?: {
      url: string;
      altText?: string | null;
    } | null;
    seo?: {
      title?: string;
      description?: string;
    };
    priceRange?: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
  };
  locale?: string;
}

export function generateProductMetadata(
  options: ProductMetadataOptions,
): Metadata {
  const { product, locale } = options;

  const title = product.seo?.title || product.title;
  const description =
    product.seo?.description ||
    product.description ||
    SEO_CONFIG.defaultDescription;

  const price = product.priceRange?.minVariantPrice;
  const priceText = price
    ? `Giá từ ${Number(price.amount).toLocaleString()} ${price.currencyCode}`
    : "";

  const fullDescription = priceText
    ? `${description} - ${priceText}`
    : description;

  return generatePageMetadata({
    title,
    description: fullDescription,
    keywords: [
      ...SEO_CONFIG.defaultKeywords,
      product.title,
      "mua " + product.title.toLowerCase(),
    ],
    image: product.featuredImage
      ? {
          url: product.featuredImage.url,
          width: 1200,
          height: 1200,
          alt: product.featuredImage.altText ?? product.title,
        }
      : undefined,
    path: `/products/${product.handle}`,
    locale,
  });
}

/**
 * Generate metadata for collection/category pages
 */
export interface CollectionMetadataOptions {
  collection: {
    title: string;
    description?: string | null;
    handle: string;
    image?: {
      url: string;
      altText?: string | null;
    } | null;
  };
  productCount?: number;
  locale?: string;
}

export function generateCollectionMetadata(
  options: CollectionMetadataOptions,
): Metadata {
  const { collection, productCount, locale } = options;

  const countText = productCount ? `${productCount} sản phẩm` : "";

  const description =
    collection.description ||
    `Khám phá bộ sưu tập ${collection.title.toLowerCase()} tại OnlyPerf. ${countText}`;

  return generatePageMetadata({
    title: collection.title,
    description,
    keywords: [
      ...SEO_CONFIG.defaultKeywords,
      collection.title,
      `${collection.title} OnlyPerf`,
    ],
    image: collection.image
      ? {
          url: collection.image.url,
          width: 1200,
          height: 630,
          alt: collection.image.altText || collection.title,
        }
      : undefined,
    path: `/collections/${collection.handle}`,
    locale,
  });
}
