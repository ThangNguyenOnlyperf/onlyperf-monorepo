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
              "pointer-events-auto h-2 w-8 rounded-full transition cursor-pointer",
              isActive ? "bg-primary" : "bg-primary/30 hover:bg-primary/60",
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
      className={cn("relative overflow-hidden rounded-3xl", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Carousel setApi={setApi} opts={{ loop: true }} className="rounded-3xl">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id}>
              <article className="relative flex min-h-[480px] w-full items-center overflow-hidden rounded-3xl bg-black text-white md:min-h-[560px]">
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
                <motion.div
                  className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12 md:px-12 md:py-20 lg:px-16"
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
                  {slide.eyebrow ? (
                    <motion.span
                      className="text-sm font-medium uppercase tracking-[0.3em] text-white/70"
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.5 },
                        },
                      }}
                    >
                      {slide.eyebrow}
                    </motion.span>
                  ) : null}
                  <motion.h2
                    className="text-2xl md:text-4xl font-semibold tracking-tight  lg:text-6xl"
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
                      className="max-w-xl text-sm sm:text-base text-white/80 lg:text-lg"
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
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 hidden lg:flex cursor-pointer" />
        <CarouselNext className="right-4 hidden lg:flex cursor-pointer" />
      </Carousel>
      <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {pagination}
      </div>
    </section>
  );
}
