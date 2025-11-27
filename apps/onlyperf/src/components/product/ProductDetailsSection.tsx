import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ProductDetailsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  descriptionHtml?: string | null;
  description?: string | null;
}

/**
 * Collapsible product details section
 * Displays product description with expand/collapse animation
 */
export function ProductDetailsSection({
  isOpen,
  onToggle,
  descriptionHtml,
  description,
}: ProductDetailsSectionProps) {
  return (
    <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Chi tiết
        </h2>
        <ChevronDown
          className={`size-5 text-zinc-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {descriptionHtml ? (
                <div
                  className="space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {description || "Sản phẩm này chưa có mô tả."}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
