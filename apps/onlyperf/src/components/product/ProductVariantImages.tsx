"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/components/lib/utils";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { StorefrontProductImage } from "@/lib/shopify/types";
import { ProductImage, ProductImageFallback } from "./ProductImage";

interface ProductVariantImagesProps {
  image: StorefrontProductImage | null;
  images?: StorefrontProductImage[];
  fallbackTitle: string;
}

export function ProductVariantImages({
  image,
  images,
  fallbackTitle,
}: ProductVariantImagesProps) {
  const [mainApi, setMainApi] = useState<CarouselApi>();
  const [thumbApi, setThumbApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // State cho mask gradient
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const allImages = useMemo(() => {
    const imageList: StorefrontProductImage[] = [];
    if (image) imageList.push(image);
    if (images && images.length > 0) {
      images.forEach((img) => {
        if (!imageList.some((existing) => existing.url === img.url)) {
          imageList.push(img);
        }
      });
    }
    return imageList;
  }, [image, images]);

  const onThumbClick = useCallback(
    (index: number) => {
      if (!mainApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi],
  );

  // Sync selected index when main carousel changes
  const onSelect = useCallback(() => {
    if (!mainApi) return;
    setSelectedIndex(mainApi.selectedScrollSnap());
  }, [mainApi]);

  // Check scroll position for thumbnail carousel
  const checkScrollPosition = useCallback(() => {
    if (!thumbApi) return;

    setCanScrollUp(thumbApi.canScrollPrev());
    setCanScrollDown(thumbApi.canScrollNext());
  }, [thumbApi]);

  // Set up event listeners for main carousel
  useEffect(() => {
    if (!mainApi) return;
    onSelect();
    mainApi.on("select", onSelect);
    return () => {
      mainApi.off("select", onSelect);
    };
  }, [mainApi, onSelect]);

  // Set up event listeners for thumbnail carousel scroll position
  useEffect(() => {
    if (!thumbApi) return;

    checkScrollPosition();
    thumbApi.on("select", checkScrollPosition);
    thumbApi.on("scroll", checkScrollPosition);

    return () => {
      thumbApi.off("select", checkScrollPosition);
      thumbApi.off("scroll", checkScrollPosition);
    };
  }, [thumbApi, checkScrollPosition]);

  // If no images at all, show fallback
  if (allImages.length === 0) {
    return <ProductImageFallback />;
  }

  // If only one image, show simple view
  if (allImages.length === 1) {
    return (
      <ProductImage
        src={allImages[0].url}
        alt={allImages[0].altText ?? fallbackTitle}
        priority
        fetchPriority="high"
      />
    );
  }

  // Multiple images - show carousel
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Thumbnail Carousel - Below on mobile, Left on desktop */}
      <div className="order-2 lg:order-1 lg:w-24">
        {/* Mobile horizontal carousel */}
        <Carousel
          setApi={setThumbApi}
          opts={{
            dragFree: true,
          }}
          className="lg:hidden"
        >
          <CarouselContent className="-ml-2">
            {allImages.map((img, index) => (
              <CarouselItem key={img.url} className="pl-2 basis-16 sm:basis-20">
                <button
                  type="button"
                  onClick={() => onThumbClick(index)}
                  className={cn(
                    "relative aspect-square w-full overflow-hidden rounded-sm border-2 transition-all group",
                    index === selectedIndex
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-transparent hover:border-zinc-400 dark:hover:border-zinc-600",
                  )}
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? fallbackTitle}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  {/* Hover overlay mask - appears darker on hover */}
                  {index !== selectedIndex && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  )}
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Desktop vertical carousel */}
        <div className="hidden rounded-sm lg:block relative">
          <Carousel
            setApi={setThumbApi}
            opts={{
              axis: "y",
              dragFree: true,
              align: "start",
            }}
            orientation="vertical"
          >
            <CarouselContent className="-mt-2 h-[425px] ">
              {allImages.map((img, index) => (
                <CarouselItem key={img.url} className="pt-2 basis-1/4">
                  <button
                    type="button"
                    onClick={() => onThumbClick(index)}
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-sm border-2 transition-all group",
                      index === selectedIndex
                        ? "border-zinc-900 dark:border-zinc-100"
                        : "border-transparent hover:border-zinc-400 dark:hover:border-zinc-600",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.altText ?? fallbackTitle}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    {/* Hover overlay mask - appears darker on hover */}
                    {index !== selectedIndex && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    )}
                  </button>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div
            className={cn(
              "absolute top-0 left-0 right-0 h-16 pointer-events-none transition-opacity duration-300 rounded-t-sm",
              "bg-gradient-to-b from-white/90 via-white/40 to-transparent dark:from-zinc-900/80 dark:via-zinc-900/40",
              canScrollUp ? "opacity-100" : "opacity-0",
            )}
          />

          {/* Bottom gradient mask - shows when can scroll down */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-16 pointer-events-none transition-opacity duration-300 rounded-b-sm",
              "bg-gradient-to-t from-white/90 via-white/40 to-transparent dark:from-zinc-900/80 dark:via-zinc-900/40",
              canScrollDown ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>

      {/* Main Preview Carousel */}
      <div className="order-1 lg:order-2 min-h-full flex-1">
        <Carousel setApi={setMainApi} className="w-full h-full">
          <CarouselContent>
            {allImages.map((img, index) => (
              <CarouselItem key={img.url}>
                <div className="relative min-h-[425px] overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={img.url}
                    alt={img.altText ?? fallbackTitle}
                    fill
                    sizes="(min-width: 1024px) 50vw, 90vw"
                    className="object-cover aspect-[16/9] "
                    priority={index === 0}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* Navigation arrows positioned inside the preview */}
          <div className="block lg:hidden">
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </div>

          <div className="hidden lg:block ">
            <CarouselPrevious
              position="bottom-right"
              className="bg-white 
            hover:bg-white/90 border-zinc-300 shadow-md 
            dark:bg-zinc-800 dark:hover:bg-zinc-700 
            dark:border-zinc-600"
            />
            <CarouselNext
              position="bottom-right"
              className="bg-white hover:bg-white/90 border-zinc-300 shadow-md dark:bg-zinc-800 
            dark:hover:bg-zinc-700 dark:border-zinc-600"
            />
          </div>
        </Carousel>
      </div>
    </div>
  );
}
