/**
 * JSON-LD Structured Data Generators
 * For rich search results in Google
 */

import { SEO_CONFIG } from "./config";

export interface Product {
  id: string;
  title: string;
  description: string;
  handle: string;
  featuredImage?: {
    url: string;
    altText?: string | null;
  } | null;
  priceRange?: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  variants?:
    | {
        edges: Array<{
          node: {
            availableForSale: boolean;
          };
        }>;
      }
    | Array<{
        availableForSale: boolean;
      }>;
  seo?: {
    title?: string;
    description?: string;
  };
}

/**
 * Organization Schema
 * Shows your business info in Google Knowledge Panel
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.organization.name,
    legalName: SEO_CONFIG.organization.legalName,
    url: SEO_CONFIG.organization.url,
    logo: `${SEO_CONFIG.siteUrl}${SEO_CONFIG.organization.logo}`,
    foundingDate: SEO_CONFIG.organization.foundingDate,
    email: SEO_CONFIG.organization.email,
    telephone: SEO_CONFIG.organization.telephone,
    address: {
      "@type": "PostalAddress",
      ...SEO_CONFIG.organization.address,
    },
    sameAs: SEO_CONFIG.organization.socialMedia,
  };
}

/**
 * Website Schema with Site Search
 * Adds search box in Google results
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO_CONFIG.siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Breadcrumb Schema
 * Shows navigation path in search results
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Product Schema
 * Rich product cards with price, availability, ratings
 */
export function generateProductSchema(product: Product, locale = "vi-VN") {
  const price = product.priceRange?.minVariantPrice.amount;
  const currency = product.priceRange?.minVariantPrice.currencyCode || "VND";

  // Handle both array format and edges format for variants
  let isAvailable = false;
  if (product.variants) {
    if ("edges" in product.variants && Array.isArray(product.variants.edges)) {
      isAvailable = product.variants.edges.some((v) => v.node.availableForSale);
    } else if (Array.isArray(product.variants)) {
      isAvailable = (product.variants as any[]).some((v) => v.availableForSale);
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.seo?.title || product.title,
    description: product.seo?.description || product.description,
    image: product.featuredImage?.url,
    url: `${SEO_CONFIG.siteUrl}/products/${product.handle}`,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: SEO_CONFIG.organization.name,
    },
    offers: {
      "@type": "Offer",
      url: `${SEO_CONFIG.siteUrl}/products/${product.handle}`,
      priceCurrency: currency,
      price: price,
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SEO_CONFIG.organization.name,
      },
    },
  };
}

/**
 * Collection/Category Page Schema
 */
export function generateCollectionSchema(collection: {
  title: string;
  description?: string | null;
  handle: string;
  products: Array<{
    id: string;
    handle: string;
    title: string;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: collection.description,
    url: `${SEO_CONFIG.siteUrl}/products/${collection.handle}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: collection.products.length,
      itemListElement: collection.products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${SEO_CONFIG.siteUrl}/products/${product.handle}`,
      })),
    },
  };
}

/**
 * Render JSON-LD script tag
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const jsonData = Array.isArray(data) ? data : [data];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonData, null, 2),
      }}
    />
  );
}
