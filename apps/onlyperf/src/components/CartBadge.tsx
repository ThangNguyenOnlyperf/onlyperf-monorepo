"use client";

import { useCart } from "@shopify/hydrogen-react";
import { AnimatePresence, motion } from "framer-motion";

export function CartBadge() {
  const { totalQuantity } = useCart();

  if (!totalQuantity || totalQuantity === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={totalQuantity}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-sm"
      >
        {totalQuantity > 9 ? "9+" : totalQuantity}
      </motion.span>
    </AnimatePresence>
  );
}
