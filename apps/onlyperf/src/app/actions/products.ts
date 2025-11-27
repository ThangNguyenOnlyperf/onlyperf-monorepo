"use server";

import type { StorefrontProduct } from "@/lib/shopify/storefront";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";
import { getProductByHandle } from "@/lib/shopify/storefront";

export interface ProductPreviewData {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
  variants: Array<{
    id: string;
    title: string;
    availableForSale: boolean;
    price: {
      amount: string;
      currencyCode: string;
    };
    image: {
      url: string;
      altText: string | null;
    } | null;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
    colorHex: string | null;
  }>;
  tags: string[];
}

export async function getProductPreviewData(
  productHandle: string,
): Promise<ProductPreviewData | null> {
  try {
    const product = await getProductByHandle(productHandle, PRIMARY_LOCALE);

    if (!product) {
      return null;
    }

    const previewData: ProductPreviewData = {
      id: product.id,
      handle: product.handle,
      title: product.title,
      description: product.description,
      featuredImage: product.featuredImage
        ? {
            url: product.featuredImage.url,
            altText: product.featuredImage.altText,
          }
        : null,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        availableForSale: variant.availableForSale,
        price: {
          amount: variant.price.amount,
          currencyCode: variant.price.currencyCode,
        },
        image: variant.image
          ? {
              url: variant.image.url,
              altText: variant.image.altText,
            }
          : null,
        selectedOptions: variant.selectedOptions.map((option) => ({
          name: option.name,
          value: option.value,
        })),
        colorHex: variant.colorHex || null,
      })),
      tags: product.tags,
    };

    return previewData;
  } catch (error) {
    console.error("Error fetching product preview data:", error);
    return null;
  }
}
