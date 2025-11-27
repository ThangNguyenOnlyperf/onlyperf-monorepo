import type { BannerItem } from "@/lib/shopify/schemas/shared";
import { ImageBannerStackClient } from "./ImageBannerStackClient";

export type { BannerItem };

interface ImageBannerStackProps {
  items: BannerItem[];
  className?: string;
}

export function ImageBannerStack(props: ImageBannerStackProps) {
  return <ImageBannerStackClient {...props} />;
}
