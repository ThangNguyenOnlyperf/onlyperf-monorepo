"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { StorefrontProduct } from "@/lib/shopify/storefront";
import { RecommendProdCard } from "../RecommendProdCard";

interface ProductRecommendationsProps {
  recommendations: StorefrontProduct[];
}

export function ProductRecommendations({
  recommendations,
}: ProductRecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 space-y-6">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Sản phẩm tương tự
          </h2>
          <div className="flex gap-2">
            <CarouselPrevious className="static translate-y-0 h-10 w-10 rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <ChevronLeft className="size-5" />
            </CarouselPrevious>
            <CarouselNext className="static translate-y-0 h-10 w-10 rounded-full border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <ChevronRight className="size-5" />
            </CarouselNext>
          </div>{" "}
        </div>

        <CarouselContent className="-ml-4">
          {recommendations.map((recommended) => (
            <CarouselItem
              key={recommended.id}
              className="pl-4 basis-[300px] shrink-0"
            >
              <RecommendProdCard product={recommended} compact />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
