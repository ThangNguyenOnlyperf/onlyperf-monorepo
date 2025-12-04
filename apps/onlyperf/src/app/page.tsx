import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import {
  FaqSection,
  HeroCarousel,
  ProductRail,
  CategoryCards,
  ImageBannerStack,
} from "@/components/home";
import { OurPlayersSection } from "@/components/home/OurPlayersSection";
import {
  getCachedHeroContent,
  getCachedRailsAndCategories,
  getCachedDiscoveryAndCommunity,
} from "@/lib/shopify/homepage";
import {
  generateOrganizationSchema,
  generatePageMetadata,
  generateWebsiteSchema,
  JsonLd,
} from "@/lib/seo";
import { getEditableHomeContent } from "@/lib/shopify/homepage";
import { getServerLocale } from "@/lib/shopify/locale";

export const revalidate = 604800; // 1 week (7 days)
export const dynamic = "force-static"; // Force static generation with ISR

export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata({
    title: "OnlyPerf - Chuyên cung cấp các sản phẩm Pickleball",
    description:
      "OnlyPerf mang đến những sản phẩm Pickleball chất lượng cho mọi tay vợt. Từ vợt, bóng đến phụ kiện chuyên dụng, chúng tôi tuyển chọn kỹ lưỡng để bạn có trải nghiệm tốt nhất trên sân. Dù bạn mới khám phá Pickleball hay đang nâng cao kỹ năng, chúng tôi luôn sẵn sàng tư vấn và hỗ trợ. Chơi đúng cách, chơi với niềm vui.",
    keywords: [
      "pickleball",
      "vợt pickleball",
      "bóng pickleball",
      "phụ kiện pickleball",
      "pickleball Vietnam",
      "onlyperf",
    ],
    path: "/",
  });
}

export default async function Home() {
  // Fetch all homepage content (cached via unstable_cache)
  // These queries are already cached individually for 1 week
  // Using Vietnamese locale for all content
  const locale = { language: "VI" as const, country: "VN" as const };
  const [heroData, railsAndCategoriesData, discoveryAndCommunityData] =
    await Promise.all([
      getCachedHeroContent(locale),
      getCachedRailsAndCategories(locale),
      getCachedDiscoveryAndCommunity(locale),
    ]);

  // Structured data for SEO
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <>
      <JsonLd data={[organizationSchema, websiteSchema]} />
      {/* Hero section */}
      {heroData?.heroSlides && heroData.heroSlides.length > 0 && (
        <HeroCarousel slides={heroData.heroSlides} />
      )}
      <div className="container-max flex flex-col gap-8 md:gap-16 px-4 pb-6 ">


        {/* Product rails */}
        {railsAndCategoriesData?.productRailTabs &&
          railsAndCategoriesData.productRailTabs.length > 0 && (
            <ProductRail tabs={railsAndCategoriesData.productRailTabs} />    
          )}

          {/* Categories */}
          {railsAndCategoriesData?.categories &&
            railsAndCategoriesData.categories.length > 0 && (
              <CategoryCards items={railsAndCategoriesData.categories} />
            )}
        {/* Discovery banners */}
        {discoveryAndCommunityData?.discoveryBanners &&
          discoveryAndCommunityData.discoveryBanners.length > 0 && (
            <ImageBannerStack
              items={discoveryAndCommunityData.discoveryBanners}
            />
          )}

        {/* Community gallery */}
        {discoveryAndCommunityData?.communityItems &&
          discoveryAndCommunityData.communityItems.length > 0 && (
            <OurPlayersSection
              items={discoveryAndCommunityData.communityItems}
            />
          )}

        {/* FAQ section (static) */}
        <FaqSection />
      </div>
    </>
  );
}
