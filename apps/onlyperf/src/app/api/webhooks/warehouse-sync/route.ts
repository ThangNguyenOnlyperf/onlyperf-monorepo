import { type NextRequest } from "next/server";
import { processWarehouseSyncEvent } from "@/actions/warehouseActions";
import { warehouseSyncSchema } from "@/lib/warehouse/schema";

/**
 * POST /api/webhooks/warehouse-sync
 * Receives events from warehouse
 *
 * Since both apps share the same DB, this webhook is mainly for:
 * 1. Triggering warranty activation when delivery is confirmed
 * 2. Handling product returns/replacements
 *
 * Note: The warehouse app updates shipment_items directly. This webhook
 * provides a hook point for onlyperf-specific logic (e.g., sending emails).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const secret = request.headers.get("X-Webhook-Secret");
    if (secret !== process.env.WAREHOUSE_WEBHOOK_SECRET) {
      console.error("❌ Webhook unauthorized: Invalid secret");
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const result = warehouseSyncSchema.safeParse(body);

    if (!result.success) {
      console.error("❌ Webhook validation failed:", result.error.issues);
      return Response.json(
        {
          success: false,
          error: "Invalid payload",
          details: result.error.issues,
        },
        { status: 400 },
      );
    }

    // 3. Process the event via action
    const eventResult = await processWarehouseSyncEvent(result.data);

    if (!eventResult.success) {
      return Response.json(
        { success: false, error: eventResult.error },
        { status: eventResult.status },
      );
    }

    return Response.json(eventResult);
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
