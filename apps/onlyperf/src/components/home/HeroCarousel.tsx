import type { HeroCarouselSlide } from "@/lib/shopify/schemas/home";
import { HeroCarouselClient } from "./HeroCarouselClient";

export type { HeroCarouselSlide };

interface HeroCarouselProps {
  slides: HeroCarouselSlide[];
  className?: string;
  autoAdvanceMs?: number;
}

export function HeroCarousel(props: HeroCarouselProps) {
  return <HeroCarouselClient {...props} />;
}
