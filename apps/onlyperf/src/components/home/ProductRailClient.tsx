"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";
import { cn } from "@/components/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductRailTab } from "@/lib/shopify/schemas/home";
import type { ProductRailItem } from "@/lib/shopify/schemas/shared";

interface ProductRailClientProps {
  tabs: ProductRailTab[];
  className?: string;
}

export function ProductRailClient({ tabs, className }: ProductRailClientProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");

  if (tabs.length === 0) {
    return null;
  }

  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <motion.section
      className={cn("space-y-2", className)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex gap-2 rounded-full bg-transparent lg:p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "rounded-full border border-brand px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition sm:px-5 sm:text-sm sm:tracking-[0.14em]",
                  "data-[state=active]:bg-brand data-[state=active]:text-white",
                  "data-[state=inactive]:bg-white data-[state=inactive]:text-brand hover:data-[state=inactive]:bg-brand/10",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {active ? (
            <Button
              variant="link"
              asChild
              className="px-0 text-sm font-semibold text-zinc-900 underline-offset-4 hover:underline"
            >
              <Link href={active.seeAllHref} aria-label="Xem tất cả sản phẩm">
                Xem tất cả
              </Link>
            </Button>
          ) : null}
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            {/* Mobile: 2-column grid with compact product cards */}
            <div className="grid grid-cols-2 gap-3 mb-0 sm:hidden">
              {tab.items.map((item) => (
                <Link key={item.id} href={item.href} className="block">
                  <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                    <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
                      <Image
                        src={item.image.src}
                        alt={item.image.alt ?? item.title}
                        fill
                        sizes="50vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex flex-col gap-1 px-2.5 py-2.5">
                      <span className="text-xs font-bold text-zinc-900">
                        {item.price}
                      </span>
                      <h3 className="line-clamp-2 text-[11px] font-light leading-tight text-zinc-900 transition hover:text-zinc-600">
                        {item.title}
                      </h3>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Tablet and above: Carousel with full product cards */}
            <Carousel
              opts={{ align: "start" }}
              className="relative hidden sm:block"
            >
              <CarouselContent className="-ml-4 pr-4">
                {tab.items.map((item, index) => (
                  <CarouselItem
                    key={item.id}
                    className="h-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        ease: "easeOut",
                      }}
                    >
                      <ProductRailCard item={item} />
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-5 hidden md:flex" />
              <CarouselNext className="-right-5 hidden md:flex" />
            </Carousel>
          </TabsContent>
        ))}
      </Tabs>
    </motion.section>
  );
}

function ProductRailCard({ item }: { item: ProductRailItem }) {
  return (
    <Link href={item.href} className="block h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-sm">
        <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
          <Image
            src={item.image.src}
            alt={item.image.alt ?? item.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition duration-700 group-hover:scale-[1.05]"
            loading="lazy"
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white p-2 text-black shadow-md transition hover:bg-zinc-100"
            aria-label={`Add ${item.title} to favorites`}
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-[140px] flex-1 flex-col gap-2 px-4 py-5">
          <span className="text-base font-bold text-zinc-900">
            {item.price}
          </span>
          <h3 className="line-clamp-3 text-sm font-light leading-tight text-zinc-900 transition hover:text-zinc-600">
            {item.title}
          </h3>
          <span className="mt-auto text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {item.category}
          </span>
        </div>
      </article>
    </Link>
  );
}
