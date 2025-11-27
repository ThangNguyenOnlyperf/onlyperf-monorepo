import type { MetadataRoute } from "next";
import { SEO_CONFIG } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/collections/", "/collections/"],
        disallow: [
          "/api/",
          "/admin/",
          "/cart/",
          "/checkout/",
          "/account/",
          "/*?*sort=", // Prevent indexing of sorted pages (duplicate content)
          "/search?", // Prevent indexing of search results
        ],
      },
      {
        userAgent: "GPTBot", // OpenAI crawler
        disallow: ["/"],
      },
      {
        userAgent: "CCBot", // Common Crawl
        disallow: ["/"],
      },
    ],
    sitemap: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
  };
}
