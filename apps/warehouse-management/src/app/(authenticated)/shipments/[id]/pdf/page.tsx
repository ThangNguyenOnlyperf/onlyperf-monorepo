import { db } from '~/server/db';
import { shipments } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import ShipmentTemplatePDFClient from '~/components/pdf/ShipmentTemplatePDFClientDynamic';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export interface ProductGroup {
  productId: string;
  productName: string;
  brand: string | null;
  model: string | null;
  itemCount: number;
}

export default async function ShipmentPDFPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch shipment with items and products
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, id),
    with: {
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  // Group items by product
  const productGroups: ProductGroup[] = [];
  if (shipment?.items) {
    const groupMap = new Map<string, ProductGroup>();

    for (const item of shipment.items) {
      if (!item.qrCode) continue; // Skip items without QR codes

      const product = item.product as { id: string; name: string; brand?: string | null; model?: string | null } | null;
      if (!product) continue;

      const existing = groupMap.get(product.id);
      if (existing) {
        existing.itemCount += 1;
      } else {
        groupMap.set(product.id, {
          productId: product.id,
          productName: product.name,
          brand: product.brand ?? null,
          model: product.model ?? null,
          itemCount: 1,
        });
      }
    }

    productGroups.push(...groupMap.values());
  }

  return <ShipmentTemplatePDFClient shipmentId={id} productGroups={productGroups} />;
}