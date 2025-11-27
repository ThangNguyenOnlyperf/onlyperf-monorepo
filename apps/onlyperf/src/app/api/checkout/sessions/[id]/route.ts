import { NextResponse } from "next/server";

import { getCheckoutSession } from "@/actions/checkout";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu id" },
        { status: 400 },
      );
    }

    const session = await getCheckoutSession(id);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get checkout session error", error);
    if (error instanceof Error) {
      if (error.message === "Session not found") {
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 404 },
        );
      }
    }
    return NextResponse.json(
      { success: false, message: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}
