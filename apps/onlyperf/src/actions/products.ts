"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shipmentItems } from "@perf/db/schema";

/**
 * Get all products owned by a customer
 * @param customerId - Shopify customer GID
 */
export async function getCustomerProducts(customerId: string) {
  try {
    const products = await db.query.shipmentItems.findMany({
      where: eq(shipmentItems.currentOwnerId, customerId),
      orderBy: (items, { desc }) => [desc(items.createdAt)],
      with: {
        product: {
          with: {
            brand: true,
          },
        },
      },
    });

    return products;
  } catch (error) {
    console.error("Failed to fetch customer products:", error);
    return [];
  }
}

/**
 * Get a single product unit by QR code
 * @param qrCode - The product's QR code
 */
export async function getProductByQrCode(qrCode: string) {
  try {
    const product = await db.query.shipmentItems.findFirst({
      where: eq(shipmentItems.qrCode, qrCode.toUpperCase()),
      with: {
        product: {
          with: {
            brand: true,
          },
        },
      },
    });

    return product ?? null;
  } catch (error) {
    console.error("Failed to fetch product by QR code:", error);
    return null;
  }
}
