"use client";

import { motion } from "framer-motion";
import { VIEWPORT_MARGIN } from "@/components/lib/constants";
import { cn } from "@/components/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqSectionProps {
  className?: string;
  items?: FaqItem[];
}

const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    question: "Điều gì làm cho vợt OnlyPerf khác biệt?",
    answer:
      "Vợt của chúng tôi có mặt sợi carbon Toray T700 cao cấp giúp kiểm soát bóng và tạo xoáy tuyệt vời. Mỗi cây vợt được chế tạo chính xác với công nghệ lõi tiên tiến để mang lại sự cân bằng hoàn hảo giữa sức mạnh và sự khéo léo.",
  },
  {
    id: "faq-2",
    question: "Bạn có cung cấp bảo hành cho sản phẩm không?",
    answer:
      "Có! Tất cả vợt OnlyPerf đều có bảo hành nhà sản xuất 1 năm cho các lỗi về vật liệu và tay nghề. Chúng tôi đứng sau chất lượng sản phẩm của mình và muốn bạn chơi bóng với sự tự tin.",
  },
  {
    id: "faq-3",
    question: "Giao hàng mất bao lâu?",
    answer:
      "Giao hàng tiêu chuẩn thường mất 3-5 ngày làm việc trong lãnh thổ Hoa Kỳ. Tùy chọn giao hàng nhanh có sẵn khi thanh toán để giao hàng nhanh hơn. Thời gian giao hàng quốc tế thay đổi tùy theo điểm đến.",
  },
  {
    id: "faq-4",
    question: "Chính sách đổi trả của bạn là gì?",
    answer:
      "Chúng tôi cung cấp chính sách đổi trả trong 30 ngày cho sản phẩm chưa sử dụng trong bao bì gốc. Nếu bạn không hoàn toàn hài lòng với việc mua hàng, hãy liên hệ với đội ngũ hỗ trợ của chúng tôi để bắt đầu đổi trả. Vận chuyển trả hàng miễn phí cho các mặt hàng bị lỗi.",
  },
  {
    id: "faq-5",
    question: "Làm thế nào để chọn trọng lượng vợt phù hợp?",
    answer:
      "Vợt nhẹ hơn (7.5-8.0 oz) cung cấp nhiều kiểm soát và khả năng vận động hơn, lý tưởng cho người chơi khéo léo. Trọng lượng vừa phải (8.0-8.5 oz) cung cấp hiệu suất cân bằng. Vợt nặng hơn (8.5+ oz) mang lại nhiều sức mạnh hơn cho lối chơi mạnh mẽ.",
  },
  {
    id: "faq-6",
    question: "Tôi có thể tùy chỉnh vợt của mình không?",
    answer:
      "Hiện tại, chúng tôi cung cấp một bộ sưu tập vợt cao cấp được lựa chọn cẩn thận với thẩm mỹ và đặc tính hiệu suất được thiết kế cẩn thận. Dịch vụ vợt tùy chỉnh có thể có sẵn trong tương lai - tham gia bản tin của chúng tôi để cập nhật!",
  },
];

export function FaqSection({
  className,
  items = DEFAULT_FAQ_ITEMS,
}: FaqSectionProps) {
  return (
    <motion.section
      className={cn("space-y-8", className)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: VIEWPORT_MARGIN }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="space-y-3">
        <motion.h2
          className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Câu Hỏi Thường Gặp
        </motion.h2>
        <motion.p
          className="max-w-2xl text-base text-zinc-600"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Mọi thứ bạn cần biết về sản phẩm và dịch vụ OnlyPerf
        </motion.p>
      </div>

      <motion.div
        className=""
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Accordion type="single" collapsible className="bg-white">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
            >
              <AccordionItem value={item.id} className="border-zinc-200">
                <AccordionTrigger className="hover:cursor-pointer">{item.question}</AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed text-zinc-600 pb-6">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </motion.div>
    </motion.section>
  );
}
