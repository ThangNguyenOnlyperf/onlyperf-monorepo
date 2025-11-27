"use client";

import { useCart } from "@shopify/hydrogen-react";
import { useState } from "react";
import { useCartDrawer } from "./useCartDrawer";

interface AddToCartOptions {
  merchandiseId: string;
  quantity: number;
}

/**
 * Custom hook for managing add to cart operations
 * Handles loading states, success animations, and cart operations
 *
 * @param successDuration - Duration to show success state (ms), defaults to 2000ms
 * @returns Add to cart state and handler function
 */
export function useAddToCart(successDuration = 2000) {
  const cart = useCart();
  const { openCartDrawer } = useCartDrawer();
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * Add item(s) to cart with loading and success states
   */
  const addToCart = async ({ merchandiseId, quantity }: AddToCartOptions) => {
    if (isAdding || showSuccess) {
      return;
    }

    setIsAdding(true);

    try {
      await cart.linesAdd([
        {
          merchandiseId,
          quantity,
        },
      ]);

      // Show success animation
      setShowSuccess(true);

      // Open cart drawer after a short delay to let button animation complete
      setTimeout(() => {
        openCartDrawer();
      }, 150);

      setTimeout(() => {
        setShowSuccess(false);
      }, successDuration);
    } catch (error) {
      // TODO: Handle error with toast notification
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return {
    isAdding,
    showSuccess,
    addToCart,
  };
}
