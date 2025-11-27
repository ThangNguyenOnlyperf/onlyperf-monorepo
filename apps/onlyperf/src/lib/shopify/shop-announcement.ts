import { unstable_cache } from "next/cache";
import type { AnnouncementBarProps } from "../../components/home/AnnouncementBar";
import { storefrontQuery } from "./client";
import { SHOP_ANNOUNCEMENT_QUERY } from "./queries/shop-announcement";

interface ShopAnnouncementQueryResult {
  shop: {
    enabled: {
      value: string;
    } | null;
    message: {
      value: string;
    } | null;
    ctaText: {
      value: string;
    } | null;
    ctaUrl: {
      value: string;
    } | null;
  };
}

/**
 * Fetches announcement bar data from Shopify shop metafields
 * Returns null if disabled or no data found
 * Cached for 1 hour to match homepage ISR strategy
 */
async function fetchAnnouncementBarData(): Promise<AnnouncementBarProps | null> {
  try {
    const data = await storefrontQuery<ShopAnnouncementQueryResult>(
      SHOP_ANNOUNCEMENT_QUERY,
    );

    // Check if announcement is enabled
    const isEnabled = data.shop.enabled?.value === "true";
    if (!isEnabled) {
      return null;
    }

    // Check if required fields are present
    const message = data.shop.message?.value;
    if (!message) {
      return null;
    }

    // Build announcement bar props
    const announcementData: AnnouncementBarProps = {
      message,
      href: data.shop.ctaUrl?.value,
      ctaLabel: data.shop.ctaText?.value || "Tìm hiểu thêm",
    };

    return announcementData;
  } catch (error) {
    console.error("Failed to fetch announcement bar data:", error);
    return null;
  }
}

/**
 * Cached version of getAnnouncementBarData
 * Revalidates every week (604800 seconds) to match homepage ISR
 * Tag: 'announcement-bar' for on-demand revalidation
 */
export const getAnnouncementBarData = unstable_cache(
  fetchAnnouncementBarData,
  ["announcement-bar"],
  {
    revalidate: 604800, // 1 week (7 days)
    tags: ["announcement-bar"],
  },
);

/**
 * Get fallback announcement bar data
 * Used when metafields are not configured yet
 */
export function getFallbackAnnouncementData(): AnnouncementBarProps {
  return {
    message: "Get 30% back when you trade in your current gear",
    href: "/trade-in",
    ctaLabel: "Explore offer",
  };
}
