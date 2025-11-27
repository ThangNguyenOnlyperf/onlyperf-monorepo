"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface Achievement {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    value: 5000,
    suffix: "+",
    label: "Khách Hàng Hài Lòng",
    description: "Đã tin tưởng và sử dụng sản phẩm OnlyPerf",
  },
  {
    value: 150,
    suffix: "+",
    label: "Sản Phẩm",
    description: "Đa dạng cho mọi nhu cầu thể thao",
  },
  {
    value: 98,
    suffix: "%",
    label: "Đánh Giá Tích Cực",
    description: "Từ khách hàng trên toàn quốc",
  },
  {
    value: 3,
    suffix: " Năm",
    label: "Kinh Nghiệm",
    description: "Phục vụ cộng đồng thể thao Việt Nam",
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: VIEWPORT_MARGIN });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [motionValue, isInView, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Math.floor(latest).toLocaleString();
      }
    });

    return () => unsubscribe();
  }, [springValue]);

  return (
    <span className="inline-flex items-baseline">
      <span ref={ref} className="tabular-nums">
        0
      </span>
      <span className="ml-1">{suffix}</span>
    </span>
  );
}

export function Achievements() {
  return (
    <section className="container-page py-16 md:py-24">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: VIEWPORT_MARGIN }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-12 text-center md:mb-16"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
            Thành Tựu
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl"
        >
          Những Con Số Ấn Tượng
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg"
        >
          Những thành tựu đạt được nhờ sự tin tưởng và ủng hộ từ cộng đồng
        </motion.p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ACHIEVEMENTS.map((achievement, index) => (
          <motion.div
            key={achievement.label}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: VIEWPORT_MARGIN }}
            transition={{
              duration: 0.5,
              delay: 0.1 * index,
              ease: "easeOut",
            }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white shadow-xl transition-transform duration-300 hover:scale-105"
          >
            {/* Background decoration */}
            <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />

            {/* Content */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + 0.1 * index }}
                className="mb-2 text-5xl font-bold sm:text-6xl"
              >
                <AnimatedCounter
                  value={achievement.value}
                  suffix={achievement.suffix}
                />
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + 0.1 * index }}
                className="mb-2 text-lg font-bold sm:text-xl"
              >
                {achievement.label}
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 + 0.1 * index }}
                className="text-sm text-emerald-100"
              >
                {achievement.description}
              </motion.p>
            </div>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-300 to-emerald-400" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
