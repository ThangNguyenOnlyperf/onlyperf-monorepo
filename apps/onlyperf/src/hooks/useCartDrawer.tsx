"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface CartDrawerContextType {
  isOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartDrawerContext = createContext<CartDrawerContextType | undefined>(
  undefined,
);

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCartDrawer = () => setIsOpen(true);
  const closeCartDrawer = () => setIsOpen(false);

  return (
    <CartDrawerContext.Provider
      value={{ isOpen, openCartDrawer, closeCartDrawer }}
    >
      {children}
    </CartDrawerContext.Provider>
  );
}

export function useCartDrawer() {
  const context = useContext(CartDrawerContext);
  if (!context) {
    throw new Error("useCartDrawer must be used within CartDrawerProvider");
  }
  return context;
}
