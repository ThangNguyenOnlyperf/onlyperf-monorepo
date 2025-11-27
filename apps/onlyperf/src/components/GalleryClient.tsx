"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/components/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface GalleryItem {
  id: string;
  src: string;
  alt?: string;
}

interface GalleryClientProps {
  items: GalleryItem[];
  className?: string;
}

export function GalleryClient({ items, className }: GalleryClientProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<GalleryItem | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const onOpen = (item: GalleryItem) => {
    setActive(item);
    setOpen(true);
    setIsZoomed(false);
  };

  return (
    <div className={className}>
      <motion.div
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {items.map((it) => (
          <motion.button
            key={it.id}
            type="button"
            onClick={() => onOpen(it)}
            aria-label={it.alt ?? "Xem ảnh"}
            className="group relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-muted cursor-pointer"
            variants={{
              hidden: { opacity: 0, scale: 0.9 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: { duration: 0.5, ease: "easeOut" },
              },
            }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src={it.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </motion.button>
        ))}
      </motion.div>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setIsZoomed(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          {active ? (
            <div className="relative overflow-hidden rounded-3xl bg-black">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-5 top-5 z-10 rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-black transition hover:bg-white"
              >
                Close
              </button>
              <div
                className="relative h-[70vh] w-full cursor-zoom-in overflow-hidden"
                onClick={() => setIsZoomed((prev) => !prev)}
              >
                <Image
                  src={active.src}
                  alt={active.alt ?? "Gallery image"}
                  fill
                  sizes="100vw"
                  className={cn(
                    "object-contain transition duration-500 ease-out",
                    isZoomed ? "scale-110" : "scale-100",
                  )}
                  priority
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
