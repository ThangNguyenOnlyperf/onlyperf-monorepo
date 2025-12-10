import { NextResponse } from "next/server";
import { processSepayWebhookAndNotifyWarehouse } from "@/actions/sepayActions";
import { env } from "@/env";
import { sepayWebhookSchema } from "@/lib/schemas/sepay";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (env.SEPAY_API_KEY) {
      const apiKey = request.headers.get("x-api-key");
      if (apiKey !== env.SEPAY_API_KEY) {
        return NextResponse.json(
          { success: false, message: "API key không hợp lệ" },
          { status: 401 },
        );
      }
    }

    const parsed = sepayWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const result = await processSepayWebhookAndNotifyWarehouse(parsed.data);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Sepay webhook error", error);
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}
