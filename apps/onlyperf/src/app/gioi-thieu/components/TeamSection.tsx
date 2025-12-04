"use client";

import { motion } from "framer-motion";
import { User } from "lucide-react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image?: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Nguyễn Văn A",
    role: "Founder & CEO",
    bio: "Với hơn 10 năm kinh nghiệm trong ngành thể thao, A mang đến tầm nhìn và chiến lược cho OnlyPerf.",
  },
  {
    name: "Trần Thị B",
    role: "Creative Director",
    bio: "Chuyên gia thiết kế với niềm đam mê kết hợp thời trang và công năng trong từng sản phẩm.",
  },
  {
    name: "Lê Minh C",
    role: "Product Manager",
    bio: "Đảm bảo mọi sản phẩm đều đạt tiêu chuẩn chất lượng cao nhất trước khi đến tay khách hàng.",
  },
  {
    name: "Phạm Thu D",
    role: "Community Manager",
    bio: "Kết nối và xây dựng cộng đồng vận động viên đam mê, tạo môi trường giao lưu và chia sẻ.",
  },
];

export function TeamSection() {
  return (
    <section className="bg-gradient-to-br from-white to-emerald-50/30 py-16 md:py-24">
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
            <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700">
              Đội Ngũ
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl"
          >
            Gặp Gỡ Đội Ngũ OnlyPerf
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mx-auto mt-4 max-w-2xl text-base text-zinc-600 sm:text-lg"
          >
            Những con người đứng sau thành công của OnlyPerf
          </motion.p>
        </motion.div>

        {/* Team Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{
                duration: 0.5,
                delay: 0.1 * index,
                ease: "easeOut",
              }}
              whileHover={{ y: -8 }}
              className="group flex"
            >
              <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition-shadow duration-300 hover:shadow-xl">
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-emerald-100 to-emerald-200">
                  {/* Placeholder - replace with actual image */}
                  <div className="flex h-full items-center justify-center">
                    {member.image ? // <Image
                    //   src={member.image}
                    //   alt={member.name}
                    //   fill
                    //   className="object-cover transition-transform duration-500 group-hover:scale-110"
                    // />
                    null : (
                      <User className="h-24 w-24 text-emerald-600/30" />
                    )}
                  </div>

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="mb-1 text-xl font-bold text-zinc-900">
                    {member.name}
                  </h3>
                  <p className="mb-3 text-sm font-medium text-emerald-600">
                    {member.role}
                  </p>
                  <p className="flex-1 text-sm leading-relaxed text-zinc-600">
                    {member.bio}
                  </p>
                </div>

                {/* Bottom accent */}
                <div className="h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-emerald-600 to-emerald-400 transition-transform duration-300 group-hover:scale-x-100" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: VIEWPORT_MARGIN }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-base text-zinc-600">
            Muốn gia nhập đội ngũ OnlyPerf?{" "}
            <a
              href="mailto:careers@onlyperf.com"
              className="font-medium text-emerald-600 underline decoration-emerald-600/30 underline-offset-4 transition-colors hover:text-emerald-700 hover:decoration-emerald-700"
            >
              Liên hệ với chúng tôi
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
