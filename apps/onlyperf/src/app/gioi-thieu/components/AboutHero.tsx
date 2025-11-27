"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function AboutHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0.6]);

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] min-h-[500px] overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100"
    >
      {/* Background with parallax */}
      <motion.div style={{ y }} className="absolute inset-0 bg-cover bg-center">
        {/* Placeholder for background image */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-emerald-900/20" />

        {/* Optional: Add actual background image here */}
        {/* <Image
          src="/images/about-hero.jpg"
          alt="OnlyPerf Background"
          fill
          className="object-cover"
        /> */}
      </motion.div>

      {/* Content overlay */}
      <motion.div
        style={{ opacity }}
        className="relative z-10 flex h-full items-center justify-center px-6"
      >
        <div className="max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">
              Câu Chuyện <span className="text-emerald-600">OnlyPerf</span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="mx-auto max-w-2xl text-lg text-zinc-700 sm:text-xl"
            >
              Hành trình tạo nên thương hiệu thể thao cao cấp, mang đến chất
              lượng và phong cách cho mọi vận động viên
            </motion.p>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-12"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="inline-block"
            >
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
