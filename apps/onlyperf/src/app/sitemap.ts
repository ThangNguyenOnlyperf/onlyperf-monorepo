import type { MetadataRoute } from "next";
import { SEO_CONFIG } from "@/lib/seo/config";
import {
  getCatalogCollections,
  getCatalogListing,
} from "@/lib/shopify/storefront";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SEO_CONFIG.siteUrl;

  // Static pages
  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    // Fetch all categories with Vietnamese locale
    const categories = await getCatalogCollections(PRIMARY_LOCALE);

    // Add category pages
    for (const category of categories) {
      routes.push({
        url: `${baseUrl}/collections/${category.handle}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // Fetch all products (from main catalog) with Vietnamese locale
    const listing = await getCatalogListing({
      productLimit: 250,
      locale: PRIMARY_LOCALE,
    });

    if (listing?.products) {
      // Add product pages
      for (const product of listing.products) {
        routes.push({
          url: `${baseUrl}/products/${product.handle}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  return routes;
}
