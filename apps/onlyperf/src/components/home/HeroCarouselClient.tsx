"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { HeroCarouselSlide } from "@/lib/shopify/schemas/home";

interface HeroCarouselClientProps {
  slides: HeroCarouselSlide[];
  className?: string;
  autoAdvanceMs?: number;
}

export function HeroCarouselClient({
  slides,
  className,
  autoAdvanceMs = 7000,
}: HeroCarouselClientProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!api) return;

    const updateIndex = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    api.on("select", updateIndex);
    updateIndex();

    return () => {
      api.off("select", updateIndex);
    };
  }, [api]);

  useEffect(() => {
    if (!api || isPaused || slides.length <= 1) return;

    const id = window.setInterval(() => {
      api.scrollNext();
    }, autoAdvanceMs);

    return () => window.clearInterval(id);
  }, [api, autoAdvanceMs, isPaused, slides.length]);

  const pagination = useMemo(
    () =>
      slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <button
            key={slide.id}
            type="button"
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "pointer-events-auto h-3 w-3 rounded-full transition cursor-pointer",
              isActive ? "bg-white" : "bg-white/30 hover:bg-white/60",
            )}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={isActive}
          />
        );
      }),
    [api, currentIndex, slides],
  );

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section
      className={cn("relative overflow-hidden mb-12 ", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id}>
              <article className="relative flex min-h-[480px] min-w-full items-center overflow-hidden bg-black text-white md:min-h-[560px]">
                <div className="absolute inset-0">
                  <Image
                    src={slide.image.src}
                    alt={slide.image.alt ?? slide.title}
                    fill
                    sizes="(min-width: 1024px) 100vw, 100vw"
                    className="object-cover"
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                <div className="w-full container-max">
                  <motion.div
                    className="relative z-10 px-6 bottom-[4rem] flex flex-col gap-6"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.15,
                          delayChildren: 0.2,
                        },
                      },
                    }}
                  >
                    <motion.h2
                      className="text-2xl md:text-4xl max-w-xl font-semibold tracking-tight w-fit lg:text-6xl"
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.6 },
                        },
                      }}
                    >
                      {slide.title}
                    </motion.h2>
                    {slide.description ? (
                      <motion.p
                        className="max-w-md prose text-sm line-clamp-3 leading-8 sm:text-base text-white/80 lg:text-lg"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.5 },
                          },
                        }}
                      >
                        {slide.description}
                      </motion.p>
                    ) : null}
                    {slide.ctas && slide.ctas.length > 0 ? (
                      <motion.div
                        className="flex flex-col gap-3 sm:flex-row"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.5,
                              staggerChildren: 0.1,
                            },
                          },
                        }}
                      >
                        {slide.ctas.map((cta) => (
                          <motion.div
                            key={cta.label}
                            variants={{
                              hidden: { opacity: 0, scale: 0.9 },
                              visible: { opacity: 1, scale: 1 },
                            }}
                          >
                            <Button
                              asChild
                              variant={cta.variant ?? "default"}
                              className={cn(
                                "pointer-events-auto",
                                cta.variant === "outline"
                                  ? "border-white/70 text-white hover:border-white hover:bg-white/10"
                                  : "",
                              )}
                            >
                              <Link href={cta.href}>{cta.label}</Link>
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : null}
                  </motion.div>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="pointer-events-none absolute inset-0 flex items-end">
          <div className="container-max relative w-full pb-4">
            <div className="pointer-events-auto absolute right-4 bottom-12 flex gap-2">
              <CarouselPrevious className="static translate-x-0 translate-y-0 hidden lg:flex cursor-pointer" />
              <CarouselNext className="static translate-x-0 translate-y-0 hidden lg:flex cursor-pointer" />
            </div>
          </div>
        </div>
      </Carousel>
      <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {pagination}
      </div>
    </section>
  );
}
