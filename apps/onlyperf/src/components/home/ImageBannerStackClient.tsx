"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";
import type { BannerItem } from "@/lib/shopify/schemas/shared";

interface ImageBannerStackClientProps {
  items: BannerItem[];
  className?: string;
}

export function ImageBannerStackClient({
  items,
  className,
}: ImageBannerStackClientProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.h2
        className="mb-4 px-1 text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Khám phá
      </motion.h2>
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: VIEWPORT_MARGIN }}
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <motion.div
              key={item.id}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: "easeOut" },
                },
              }}
            >
              <Link
                href={item.href}
                aria-label={item.alt}
                className="group relative block w-full overflow-hidden rounded-none"
              >
                <div className="relative aspect-[16/9]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="100vw"
                    className="object-cover transition-all duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 shadow-sm transition-shadow duration-300 group-hover:shadow-xl" />
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}
