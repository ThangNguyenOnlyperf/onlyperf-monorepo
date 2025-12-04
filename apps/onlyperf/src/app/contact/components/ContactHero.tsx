"use client";

import { motion } from "framer-motion";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

export function ContactHero() {
  return (
    <section >
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-4"
          >
            <span className="inline-block rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand">
              Liên hệ
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl"
          >
            Liên hệ với chúng tôi
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg"
          >
            Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy liên hệ với OnlyPerf qua các
            kênh dưới đây để được tư vấn về sản phẩm và dịch vụ.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
