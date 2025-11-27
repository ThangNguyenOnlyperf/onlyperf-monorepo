"use client";

import { CartProvider, ShopifyProvider } from "@shopify/hydrogen-react";
import type { ReactNode } from "react";
import type { ShopifyPublicConfig } from "../lib/shopify/config";
import { CUSTOM_CART_FRAGMENT } from "@/lib/shopify/cart-fragment";

interface ShopifyProvidersProps {
  children: ReactNode;
  config: ShopifyPublicConfig;
}

export function ShopifyProviders({ children, config }: ShopifyProvidersProps) {
  const { countryIsoCode, languageIsoCode, ...shopifyConfig } = config;

  return (
    <ShopifyProvider
      countryIsoCode={"VN"}
      languageIsoCode={"VI"}
      {...shopifyConfig}
    >
      <CartProvider
        countryCode={countryIsoCode}
        languageCode={languageIsoCode}
        cartFragment={CUSTOM_CART_FRAGMENT}
      >
        {children}
      </CartProvider>
    </ShopifyProvider>
  );
}
