import type { ProductRailTab } from "@/lib/shopify/schemas/home";
import type { ProductRailItem } from "@/lib/shopify/schemas/shared";
import { ProductRailClient } from "./ProductRailClient";

export type { ProductRailItem, ProductRailTab };

interface ProductRailProps {
  tabs: ProductRailTab[];
  className?: string;
}

export function ProductRail(props: ProductRailProps) {
  return <ProductRailClient {...props} />;
}
