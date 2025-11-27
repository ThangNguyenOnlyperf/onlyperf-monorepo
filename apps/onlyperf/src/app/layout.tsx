import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ShopifyProviders } from "@/components/ShopifyProviders";
import { QueryProviderWrapper } from "@/components/QueryProviderWrapper";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { UserSessionProvider } from "@/contexts/UserSessionContext";
import { AnnouncementBar, Navbar } from "@/components/home";
import { Footer } from "@/components/layout/Footer";
import { CartDrawerProvider } from "@/hooks/useCartDrawer";
import { getShopifyPublicConfig } from "@/lib/shopify/config";
import { getAnnouncementBarData } from "@/lib/shopify/shop-announcement";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";
import "./globals.css";
import { CartDrawer } from "@/components/cart/CartDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com",
  ),
  title: {
    template: "%s | OnlyPerf",
    default: "OnlyPerf - Chuyên cung cấp các sản phẩm Pickleball",
  },
  description:
    "OnlyPerf mang đến những sản phẩm Pickleball chất lượng cho mọi tay vợt. Từ vợt, bóng đến phụ kiện chuyên dụng, chúng tôi tuyển chọn kỹ lưỡng để bạn có trải nghiệm tốt nhất trên sân.",
  keywords: [
    "pickleball",
    "vợt pickleball",
    "bóng pickleball",
    "phụ kiện pickleball",
    "pickleball Vietnam",
    "onlyperf",
  ],
  authors: [{ name: "OnlyPerf" }],
  creator: "OnlyPerf",
  publisher: "OnlyPerf",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/favicons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com",
    siteName: "OnlyPerf",
    title: "OnlyPerf - Thời trang thể thao cao cấp",
    description:
      "OnlyPerf - Thương hiệu thời trang thể thao cao cấp. Khám phá bộ sưu tập quần áo, giày dép và phụ kiện thể thao chất lượng.",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "OnlyPerf",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@onlyperf",
    creator: "@onlyperf",
  },
  robots: {
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
  verification: {
    google: "your-google-verification-code", // Replace with actual code
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Cache layout for 1 week (same as home page ISR)
export const revalidate = 604800;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shopifyConfig = getShopifyPublicConfig();

  // Fetch announcement bar data (already cached with unstable_cache for 1 week)
  let announcementData = null;
  try {
    announcementData = await getAnnouncementBarData();
  } catch (error) {
    console.error("[RootLayout] Failed to fetch announcement bar:", error);
  }

  // Use primary locale (Vietnam) as default for static generation
  // Client-side locale detection handled by middleware + LocaleProvider
  const locale = PRIMARY_LOCALE;

  return (
    <html lang={locale.language.toLowerCase()}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider initialLocale={locale}>
          <ShopifyProviders config={shopifyConfig}>
            <UserSessionProvider>
              <CartDrawerProvider>
                <QueryProviderWrapper>
                  {announcementData && (
                    <AnnouncementBar {...announcementData} />
                  )}
                  <Navbar />
                  <main className="bg-background">{children}</main>
                  <Footer />
                  <CartDrawer />
                </QueryProviderWrapper>
              </CartDrawerProvider>
            </UserSessionProvider>
          </ShopifyProviders>
        </LocaleProvider>
      </body>
    </html>
  );
}
