"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Zap, Users, Globe } from "lucide-react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface Value {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const VALUES: Value[] = [
  {
    icon: <BadgeCheck className="h-8 w-8" />,
    title: "Chất Lượng Cao Cấp",
    description:
      "Sử dụng vật liệu và công nghệ tiên tiến nhất để mang đến sản phẩm bền bỉ, thoải mái và hiệu suất vượt trội.",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "Đổi Mới Sáng Tạo",
    description:
      "Không ngừng nghiên cứu và phát triển những thiết kế mới, kết hợp xu hướng thời trang với công nghệ thể thao.",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Cộng Đồng Thể Thao",
    description:
      "Xây dựng và hỗ trợ cộng đồng vận động viên Việt Nam, tạo không gian kết nối và chia sẻ niềm đam mê thể thao.",
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Bền Vững & Trách Nhiệm",
    description:
      "Cam kết sử dụng quy trình sản xuất thân thiện với môi trường và đóng góp tích cực cho xã hội.",
  },
];

export function MissionValues() {
  return (
    <section className="bg-gradient-to-br from-emerald-50 to-white py-16 md:py-24">
      <div className="container-page">
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
            <span className="inline-block rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">
              Giá Trị Cốt Lõi
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl"
          >
            Những Gì Chúng Tôi Đại Diện
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg"
          >
            Sứ mệnh của OnlyPerf là tạo ra những sản phẩm thể thao tốt nhất,
            giúp mọi người tự tin theo đuổi đam mê và đạt được mục tiêu của
            mình.
          </motion.p>
        </motion.div>

        {/* Values Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{
                duration: 0.5,
                delay: 0.1 * index,
                ease: "easeOut",
              }}
              whileHover={{ y: -8 }}
              className="group relative flex"
            >
              <div className="relative flex flex-col overflow-hidden rounded-2xl bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-xl">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    delay: 0.2 + 0.1 * index,
                  }}
                  className="mb-4 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-600 transition-colors duration-300 group-hover:bg-emerald-600 group-hover:text-white"
                >
                  {value.icon}
                </motion.div>

                {/* Content */}
                <h3 className="mb-3 text-xl font-bold text-zinc-900">
                  {value.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-zinc-600">
                  {value.description}
                </p>

                {/* Hover accent */}
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
