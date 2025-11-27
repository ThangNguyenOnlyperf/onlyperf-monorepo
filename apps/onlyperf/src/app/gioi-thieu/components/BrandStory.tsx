"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

export function BrandStory() {
  return (
    <section className="container-page py-16 md:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Image Side */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: VIEWPORT_MARGIN }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative"
        >
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200">
            {/* Placeholder - replace with actual image */}
            <div className="flex h-full items-center justify-center text-emerald-600/30">
              {/* <Image
                src="/images/about/brand-story.jpg"
                alt="OnlyPerf Brand Story"
                fill
                className="object-cover"
              /> */}
              <svg
                className="h-24 w-24"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute -bottom-6 -right-6 -z-10 h-full w-full rounded-2xl bg-emerald-600/10" />
        </motion.div>

        {/* Content Side */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: VIEWPORT_MARGIN }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="flex flex-col justify-center space-y-6"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
                Nguồn Gốc
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Khởi Đầu Từ Đam Mê Thể Thao
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-4 text-base leading-relaxed text-zinc-600"
          >
            <p>
              OnlyPerf ra đời từ niềm đam mê cháy bỏng với thể thao và mong muốn
              mang đến cho các vận động viên Việt Nam những sản phẩm chất lượng
              cao cấp, thiết kế hiện đại và giá cả phải chăng.
            </p>
            <p>
              Chúng tôi tin rằng mọi người đều xứng đáng có được những trang
              phục thể thao tốt nhất để thể hiện bản thân và đạt được mục tiêu
              tập luyện của mình. Từ đó, OnlyPerf không ngừng nỗ lực để tạo ra
              những sản phẩm kết hợp hoàn hảo giữa công nghệ, phong cách và hiệu
              suất.
            </p>
            <p>
              Hành trình của chúng tôi bắt đầu từ một ý tưởng nhỏ và đã phát
              triển thành một thương hiệu được hàng ngàn vận động viên tin tưởng
              lựa chọn mỗi ngày.
            </p>
          </motion.div>

          {/* Optional: Add founder signature or quote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="border-l-4 border-emerald-600 pl-6"
          >
            <p className="italic text-zinc-700">
              "Chúng tôi không chỉ bán sản phẩm, chúng tôi truyền cảm hứng cho
              lối sống năng động và khỏe mạnh."
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-900">
              — Đội ngũ sáng lập OnlyPerf
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
