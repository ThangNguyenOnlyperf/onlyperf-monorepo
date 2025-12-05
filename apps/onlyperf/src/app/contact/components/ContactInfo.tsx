"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail } from "lucide-react";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";

interface ContactCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const CONTACT_CARDS: ContactCard[] = [
  {
    id: "address",
    icon: <MapPin className="h-8 w-8" />,
    title: "Địa chỉ",
    content: (
      <p className="leading-relaxed">
        Số 123, phố Nguyễn Văn A
        <br />
        Phường Hoàn Kiếm
        <br />
        TP Hà Nội
      </p>
    ),
  },
  {
    id: "phone",
    icon: <Phone className="h-8 w-8" />,
    title: "Điện thoại",
    content: (
      <div className="space-y-2">
        <div>
          <p className="font-medium text-zinc-900">Tổng đài CSKH</p>
          <a
            href="tel:0918635365"
            className="hover:text-brand transition-colors"
          >
            xxxx.xxx.xxx
          </a>
        </div>
      </div>
    ),
  },
  {
    id: "email",
    icon: <Mail className="h-8 w-8" />,
    title: "Email",
    content: (
      <div className="space-y-2">
        <div>
          <p className="font-medium text-zinc-900">Phòng kinh doanh</p>
          <a
            href="mailto:business@perf.com"
            className="hover:text-brand transition-colors break-all"
          >
            business@perf.com
          </a>
        </div>
      </div>
    ),
  },
  
];

export function ContactInfo() {
  return (
    <section className="container-max mx-auto">
      <div className="container-page">
        <div className="flex flex-col gap-4">
          {/* Left Column: Intro Text */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Liên hệ với OnlyPerf
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: VIEWPORT_MARGIN }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base leading-relaxed text-zinc-600 mt-6 "
            >
              Liên hệ với chúng tôi qua các kênh sau để được tư vấn nhanh chóng và tận tâm.
            </motion.p>
          </div>

          {/* Right Column: Cards Stacked Vertically */}
          <div className="flex flex-col gap-6">
            {CONTACT_CARDS.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: VIEWPORT_MARGIN }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 * index,
                  ease: "easeOut",
                }}
                whileHover={{ y: -8 }}
                className="group relative flex h-full flex-col py-8 px-4 overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                {/* Icon Container */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-brand transition-colors duration-300">
                  {card.icon}
                  <span className="font-semibold">{card.title}</span>
                </div>

                {/* Content */}
                <div className="flex-1 text-sm text-zinc-600">{card.content}</div>

                {/* Hover Accent Line */}
                <div className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-brand to-purple-400 transition-transform duration-300 group-hover:scale-x-100" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
