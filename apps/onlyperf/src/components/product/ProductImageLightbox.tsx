"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { StorefrontProductImage } from "@/lib/shopify/types";

interface ProductImageLightboxProps {
  images: StorefrontProductImage[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fallbackTitle: string;
}

export function ProductImageLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
  fallbackTitle,
}: ProductImageLightboxProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [thumbApi, setThumbApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState<100 | 150 | 200>(100);

  // Reset zoom when changing slides
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentIndex(api.selectedScrollSnap());
      setZoomLevel(100); // Reset zoom to 100% on slide change
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Scroll to initial index when dialog opens
  useEffect(() => {
    if (api && open) {
      api.scrollTo(initialIndex, true); // Jump without animation
    }
  }, [api, open, initialIndex]);

  // Sync thumbnail carousel with main carousel
  useEffect(() => {
    if (!thumbApi || !api) return;
    thumbApi.scrollTo(currentIndex);
  }, [thumbApi, api, currentIndex]);

  // Cycle through zoom levels: 100 → 150 → 200 → 100
  const toggleZoom = useCallback(() => {
    setZoomLevel((prev) => {
      if (prev === 100) return 150;
      if (prev === 150) return 200;
      return 100;
    });
  }, []);

  // Handle thumbnail click to navigate to specific image
  const handleThumbClick = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          api?.scrollPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          api?.scrollNext();
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
        case "z":
        case "Z":
          e.preventDefault();
          toggleZoom();
          break;
      }
    },
    [api, open, onOpenChange, toggleZoom],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const getZoomScale = () => {
    if (zoomLevel === 150) return "scale-150";
    if (zoomLevel === 200) return "scale-200";
    return "scale-100";
  };

  const getCursor = () => {
    if (zoomLevel === 100) return "cursor-zoom-in";
    return "cursor-zoom-out";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed inset-0 min-w-screen h-screen max-w-none border-none bg-black/95 p-0 translate-x-0 translate-y-0 rounded-none flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle></DialogTitle>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white rounded-full"
          aria-label="Close lightbox"
        >
          <X className="size-6" />
        </Button>

        {/* Image counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/10 px-4 py-2 rounded-full text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Carousel */}
        <Carousel
          setApi={setApi}
          className="flex-1 w-full"
          opts={{ loop: false }}
        >
          <CarouselContent className="h-full">
            {images.map((img, index) => (
              <CarouselItem key={img.url} className="h-full p-0 ">
                <div className="min-h-screen min-w-full flex items-center justify-center overflow-hidden">
                  <Image
                    src={img.url}
                    alt={img.altText ?? fallbackTitle}
                    width={1200}
                    height={800}
                    className={cn(
                      " h-auto object-contain min-w-full flex items-center aspect-video transition-transform duration-300 ease-out",
                      getZoomScale(),
                      getCursor(),
                    )}
                    onClick={toggleZoom}
                    priority={index === initialIndex}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
            <>
              <CarouselPrevious className="left-4 bg-white/10 hover:bg-white/20 border-none text-white" />
              <CarouselNext className="right-4 bg-white/10 hover:bg-white/20 border-none text-white" />
            </>
          )}
        </Carousel>

        {/* Thumbnail Preview Carousel - Fullwidth at bottom */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm py-4 px-4">
            <Carousel
              setApi={setThumbApi}
              opts={{
                align: "center",
                containScroll: "keepSnaps",
                dragFree: true,
              }}
              className="w-full max-w-3xl mx-auto"
            >
              <CarouselContent className="-ml-2">
                {images.map((img, index) => (
                  <CarouselItem key={img.url} className="basis-16 md:basis-20 pl-2">
                    <button
                      type="button"
                      onClick={() => handleThumbClick(index)}
                      className={cn(
                        "relative aspect-square w-full overflow-hidden rounded-md border-2 transition-all",
                        index === currentIndex
                          ? "border-white ring-2 ring-white/50"
                          : "border-transparent opacity-60 hover:opacity-100",
                      )}
                    >
                      <Image
                        src={img.url}
                        alt={img.altText ?? `Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Zoom indicator */}
            <div className="text-center mt-2 text-white text-xs font-medium opacity-70">
              {zoomLevel}% • Press Z to zoom
            </div>
          </div>
        )}

        {/* Zoom indicator for single image */}
        {images.length === 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/10 px-3 py-2 rounded-full text-white text-xs font-medium">
            {zoomLevel}% • Press Z to zoom
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
