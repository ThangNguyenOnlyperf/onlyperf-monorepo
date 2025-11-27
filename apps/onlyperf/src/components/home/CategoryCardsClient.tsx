"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";
import { cn } from "@/components/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

export interface CategoryCard {
  id: string;
  title: string;
  href: string;
  image: {
    src: string;
    alt: string;
  };
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    id: "rackets",
    title: "Vợt",
    href: "/collections/rackets",
    image: {
      src: "/images/rackets.jpg",
      alt: "Bộ sưu tập vợt Pickleball của Onlyperf",
    },
  },
  {
    id: "accessories",
    title: "Phụ kiện",
    href: "/collections/accessories",
    image: {
      src: "/images/accessories.jpg",
      alt: "Phụ kiện Pickleball cao cấp của Onlyperf",
    },
  },
];

interface CategoryCardsClientProps {
  items?: CategoryCard[];
  className?: string;
}

function CategoryCardSkeleton() {
  return (
    <div className="relative overflow-hidden">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/10 to-transparent" />
      <div className="absolute bottom-6 left-6 right-6">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function CategoryCardsClient({
  items,
  className,
}: CategoryCardsClientProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => new Set(prev).add(id));
  };

  return (
    <motion.section
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.h2
        className="px-1 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Danh mục nổi bật
      </motion.h2>
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: VIEWPORT_MARGIN }}
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {(items ?? CATEGORY_CARDS).map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative block overflow-hidden border border-transparent transition-all duration-300 hover:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            <motion.article
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: "easeOut" },
                },
              }}
              className="relative"
            >
              <div className="relative aspect-[3/4] w-full">
                {!loadedImages.has(item.id) && <CategoryCardSkeleton />}
                <Image
                  src={item.image.src}
                  alt={item.image.alt}
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                  className={cn(
                    "object-cover transition duration-700",
                    loadedImages.has(item.id) ? "opacity-100" : "opacity-0",
                  )}
                  loading="lazy"
                  onLoad={() => handleImageLoad(item.id)}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {item.title}
                </h3>
              </div>
            </motion.article>
          </Link>
        ))}
      </motion.div>
    </motion.section>
  );
}
