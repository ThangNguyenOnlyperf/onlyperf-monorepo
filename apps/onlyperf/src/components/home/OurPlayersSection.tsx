"use client";

import { motion } from "framer-motion";
import Gallery, { type GalleryItem } from "@/components/Gallery";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface OurPlayersSectionProps {
  items: GalleryItem[];
}

export function OurPlayersSection({ items }: OurPlayersSectionProps) {
  return (
    <motion.section
      className="space-y-4"
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
        Cộng đồng
      </motion.h2>
      <Gallery items={items} />
    </motion.section>
  );
}
