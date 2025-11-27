import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@shopify/hydrogen-react"],
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "*.myshopify.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "qr.sepay.vn",
      },
    ],
  },
  experimental: {},
  async rewrites() {
    return [
      {
        source: "/:locale(en|vi|fr|de|ja)/:path*",
        destination: "/:path*?locale=:locale",
      },
    ];
  },
};

export default nextConfig;
