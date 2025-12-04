"use client";

import { motion } from "framer-motion";
import { Facebook, Instagram } from "lucide-react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "facebook",
    name: "Facebook",
    url: "https://facebook.com/onlyperf",
    ariaLabel: "Theo dõi OnlyPerf trên Facebook",
    icon: <Facebook className="h-8 w-8" />,
  },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://instagram.com/onlyperf",
    ariaLabel: "Theo dõi OnlyPerf trên Instagram",
    icon: <Instagram className="h-8 w-8" />,
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://tiktok.com/@onlyperf",
    ariaLabel: "Theo dõi OnlyPerf trên TikTok",
    icon: (
      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
      </svg>
    ),
  },
];

export function SocialMedia() {
  return (
    <section>
      <div className="container-page">
        <div className="flex flex-col-reverse lg:grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Column: Social Cards Stacked Vertically */}
          <div className="flex flex-col gap-6">
            {SOCIAL_LINKS.map((social, index) => (
              <motion.a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.ariaLabel}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: VIEWPORT_MARGIN }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 * index,
                  ease: "easeOut",
                }}
                whileHover={{ y: -8 }}
                className="group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl bg-white py-8 px-4 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                {/* Icon Container */}
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand transition-all duration-300 group-hover:bg-brand group-hover:text-white">
                  {social.icon}
                </div>

                {/* Platform Name */}
                <span className="text-lg font-semibold text-zinc-900">
                  {social.name}
                </span>

                {/* Hover Accent Line */}
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-brand to-purple-400 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.a>
            ))}
          </div>

          {/* Right Column: Title + Description */}
          <div className="flex flex-col space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Kết nối với chúng tôi
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base leading-relaxed text-zinc-600"
            >
              Theo dõi OnlyPerf trên các kênh mạng xã hội để cập nhật tin tức và
              sản phẩm mới nhất
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
