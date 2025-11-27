/**
 * Product transformation utilities
 */

import { formatPrice } from "../formatters";
import type { StorefrontProduct } from "./storefront";

const FALLBACK_IMAGE =
  "https://cdn.shopify.com/static/sample-images/shoes.jpeg";

export interface ProductImage {
  src: string;
  alt: string;
}

export function getProductImage(product: StorefrontProduct): ProductImage {
  const image = product.featuredImage ?? product.variant.image;

  return {
    src: image?.url ?? FALLBACK_IMAGE,
    alt: image?.altText ?? product.title,
  };
}

export interface ProductRailItem {
  id: string;
  title: string;
  category: string;
  price: string;
  href: string;
  tag?: string;
  image: ProductImage;
}

export function toRailItem(
  product: StorefrontProduct,
  tag?: string,
  categoryLabel?: string,
): ProductRailItem {
  const image = getProductImage(product);

  return {
    id: product.id,
    title: product.title,
    category: categoryLabel ?? "Featured",
    price: formatPrice(product.variant.price),
    href: `/products/${product.handle}`,
    tag,
    image,
  };
}
