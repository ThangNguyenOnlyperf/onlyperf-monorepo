import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

interface ProductAddToCartButtonProps {
  isAdding: boolean;
  showSuccess: boolean;
  availableForSale: boolean;
  quantity: number;
  currencyCode: string;
  totalPrice: string;
  productTitle: string;
  onClick: () => void;
}

/**
 * Animated add to cart button component
 * Shows loading, success, and out of stock states
 */
export function ProductAddToCartButton({
  isAdding,
  showSuccess,
  availableForSale,
  quantity,
  currencyCode,
  totalPrice,
  productTitle,
  onClick,
}: ProductAddToCartButtonProps) {
  const isDisabled = !availableForSale || isAdding || showSuccess;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      initial={false}
      animate={
        showSuccess
          ? {
              scale: 1.02,
            }
          : {
              scale: 1,
            }
      }
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
      }}
      className={`w-full cursor-pointer rounded-full px-6 h-12 text-base font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${
        showSuccess
          ? "bg-emerald-600 hover:bg-emerald-700"
          : "bg-primary hover:bg-primary/90"
      }`}
      aria-label={`${isAdding ? "Đang thêm" : showSuccess ? "Đã thêm" : "Thêm"} ${quantity} ${productTitle} vào giỏ hàng`}
    >
      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.span
            key="adding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Đang thêm...
          </motion.span>
        ) : showSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center justify-center gap-2"
          >
            <Check className="size-5" />
            Đã thêm!
          </motion.span>
        ) : !availableForSale ? (
          <motion.span
            key="out-of-stock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Hết hàng
          </motion.span>
        ) : (
          <motion.span
            key="add"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Thêm {quantity} vào giỏ • {currencyCode === "VND" ? "₫" : "$"}
            {currencyCode === "VND"
              ? new Intl.NumberFormat("vi-VN").format(parseFloat(totalPrice))
              : totalPrice}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
