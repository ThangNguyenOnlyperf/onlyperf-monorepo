# Ecommerce Sepay Integration — Copy/Paste Setup Guide

This guide moves Sepay (QR bank transfer) integration to the Ecommerce app, notifies Warehouse via an internal signed webhook, and uses the same Postgres database. It’s optimized for copy/paste speed.

## Architecture Summary
- Ecommerce owns Sepay webhook, transaction storage, and warehouse notifications.
- Warehouse owns inventory, reservations, fulfillment, and order state.
- Communication: Ecommerce → Warehouse internal webhook (`order.paid`), HMAC-signed.

## What to Add in Ecommerce
Create the following files (adapt paths if your alias differs from `~` → `src`).

1) `drizzle.config.ts`
```ts
import { type Config } from "drizzle-kit";
import { env } from "./src/env.js";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  out: "./drizzle",
  strict: true,
  verbose: true,
} satisfies Config;
```

2) `src/env.js`
```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SEPAY_API_KEY: z.string().optional(),
    WAREHOUSE_WEBHOOK_URL: z.string().url(),
    WAREHOUSE_WEBHOOK_SECRET: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    SEPAY_API_KEY: process.env.SEPAY_API_KEY,
    WAREHOUSE_WEBHOOK_URL: process.env.WAREHOUSE_WEBHOOK_URL,
    WAREHOUSE_WEBHOOK_SECRET: process.env.WAREHOUSE_WEBHOOK_SECRET,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

3) `src/server/db/index.ts`
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "~/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { conn: postgres.Sql | undefined };
const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
```

4) `src/server/db/schema.ts` (transactions only)
```ts
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const sepayTransactions = pgTable("sepay_transactions", {
  id: text("id").primaryKey().$defaultFn(() => `sepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
  sepayTransactionId: text("sepay_transaction_id").unique(),
  gateway: text("gateway").notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  accountNumber: text("account_number"),
  subAccount: text("sub_account"),
  amountIn: text("amount_in").notNull().default("0"),
  amountOut: text("amount_out").notNull().default("0"),
  accumulated: text("accumulated").notNull().default("0"),
  code: text("code"),
  transactionContent: text("transaction_content"),
  referenceNumber: text("reference_number"),
  body: text("body"),
  transferType: text("transfer_type").notNull(),
  transferAmount: text("transfer_amount").notNull(),
  orderId: text("order_id"), // free text, no FK in Ecommerce
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sepayTransactionIdIdx: index("sepay_transactions_sepay_transaction_id_idx").on(table.sepayTransactionId),
  gatewayIdx: index("sepay_transactions_gateway_idx").on(table.gateway),
  transactionDateIdx: index("sepay_transactions_transaction_date_idx").on(table.transactionDate),
  accountNumberIdx: index("sepay_transactions_account_number_idx").on(table.accountNumber),
  referenceNumberIdx: index("sepay_transactions_reference_number_idx").on(table.referenceNumber),
  codeIdx: index("sepay_transactions_code_idx").on(table.code),
  orderIdIdx: index("sepay_transactions_order_id_idx").on(table.orderId),
  processedIdx: index("sepay_transactions_processed_idx").on(table.processed),
  transferTypeIdx: index("sepay_transactions_transfer_type_idx").on(table.transferType),
}));
```

5) `src/lib/schemas/sepay.ts`
```ts
import { z } from "zod";

export const sepayWebhookSchema = z.object({
  id: z.number(),
  gateway: z.string(),
  transactionDate: z.string(),
  accountNumber: z.string().optional().nullable(),
  code: z.string().nullable().optional(),
  content: z.string(),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.number(),
  accumulated: z.number(),
  subAccount: z.string().nullable().optional(),
  referenceCode: z.string(),
  description: z.string().optional().default(""),
});

export type SepayWebhookData = z.infer<typeof sepayWebhookSchema>;
```

6) `src/lib/security/hmac.ts`
```ts
import crypto from "crypto";

export function signBodyHmacSha256(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function buildSignedHeaders(body: unknown, secret: string) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBodyHmacSha256(`${raw}.${timestamp}`, secret);
  return { signature, timestamp, raw };
}
```

7) `src/actions/warehouseActions.ts`
```ts
"use server";

import { env } from "~/env";
import { buildSignedHeaders } from "~/lib/security/hmac";

type OrderPaidEvent = {
  event: "order.paid";
  provider: "sepay";
  sepayTransactionId: string;
  paymentCode: string;
  amount: number;
  currency: "VND";
  paidAt: string; // ISO
  referenceCode: string;
  gateway: string;
};

export async function notifyWarehouseOrderPaid(payload: OrderPaidEvent) {
  const { raw, signature, timestamp } = buildSignedHeaders(payload, env.WAREHOUSE_WEBHOOK_SECRET);

  const res = await fetch(env.WAREHOUSE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature": signature,
      "X-Timestamp": timestamp,
    },
    body: raw,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Warehouse webhook failed: ${res.status} ${text}`);
  }
}
```

8) `src/actions/sepayActions.ts`
```ts
"use server";

import { db } from "~/server/db";
import { sepayTransactions } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { SepayWebhookData } from "~/lib/schemas/sepay";
import { notifyWarehouseOrderPaid } from "~/actions/warehouseActions";

function extractPaymentCode(content: string) {
  const regex = /PERF([A-Z0-9]+)/;
  const m = content.match(regex);
  return m?.[0] ?? null;
}

export async function processSepayWebhookAndNotifyWarehouse(data: SepayWebhookData) {
  if (data.transferType !== "in") {
    return { success: false, message: "Chỉ xử lý giao dịch tiền vào" };
  }

  const existed = await db
    .select()
    .from(sepayTransactions)
    .where(eq(sepayTransactions.sepayTransactionId, data.id.toString()))
    .limit(1);

  if (existed.length > 0) {
    return { success: true, message: "Đã nhận giao dịch này trước đó" };
  }

  const id = `sepay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const paymentCode = extractPaymentCode(data.content);

  await db.insert(sepayTransactions).values({
    id,
    sepayTransactionId: data.id.toString(),
    gateway: data.gateway,
    transactionDate: new Date(data.transactionDate),
    accountNumber: data.accountNumber ?? "",
    subAccount: data.subAccount ?? "",
    amountIn: data.transferAmount.toString(),
    amountOut: "0",
    accumulated: data.accumulated.toString(),
    code: data.code ?? "",
    transactionContent: data.content,
    referenceNumber: data.referenceCode,
    body: JSON.stringify(data),
    transferType: data.transferType,
    transferAmount: data.transferAmount.toString(),
    processed: false,
  });

  if (!paymentCode) {
    return { success: false, message: `Không tìm thấy mã thanh toán trong nội dung: ${data.content}` };
  }

  await notifyWarehouseOrderPaid({
    event: "order.paid",
    provider: "sepay",
    sepayTransactionId: data.id.toString(),
    paymentCode,
    amount: data.transferAmount,
    currency: "VND",
    paidAt: new Date(data.transactionDate).toISOString(),
    referenceCode: data.referenceCode,
    gateway: data.gateway,
  });

  await db
    .update(sepayTransactions)
    .set({ processed: true, updatedAt: new Date() })
    .where(eq(sepayTransactions.id, id));

  return {
    success: true,
    message: "Đã ghi nhận thanh toán và thông báo Warehouse",
    data: { transactionId: id },
  };
}
```

9) `src/app/api/webhooks/sepay/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { sepayWebhookSchema } from "~/lib/schemas/sepay";
import { processSepayWebhookAndNotifyWarehouse } from "~/actions/sepayActions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (env.SEPAY_API_KEY) {
      const provided = request.headers.get("x-api-key");
      if (provided !== env.SEPAY_API_KEY) {
        return NextResponse.json({ success: false, message: "API key không hợp lệ" }, { status: 401 });
      }
    }

    const parse = sepayWebhookSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ success: false, message: "Payload không hợp lệ" }, { status: 400 });
    }

    const result = await processSepayWebhookAndNotifyWarehouse(parse.data);
    const status = result.success ? 200 : 400;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("Sepay webhook error:", err);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ" }, { status: 500 });
  }
}
```

## Packages
- Runtime: `drizzle-orm postgres zod @t3-oss/env-nextjs`
- Dev: `drizzle-kit`

Example:
```bash
pnpm add drizzle-orm postgres zod @t3-oss/env-nextjs
pnpm add -D drizzle-kit
```

## Env Variables
- `DATABASE_URL`
- `SEPAY_API_KEY` (optional; header check)
- `WAREHOUSE_WEBHOOK_URL` (e.g. https://warehouse.example.com/api/webhooks/ecommerce/order-paid)
- `WAREHOUSE_WEBHOOK_SECRET` (HMAC secret)

## Scripts (optional)
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```
Note: If Warehouse owns the schema, avoid running `db:push`/`migrate` from Ecommerce. Use read-only or coordinate migrations.

## Warehouse Expectations
- Implement `POST /api/webhooks/ecommerce/order-paid` with HMAC verification (`X-Signature`, `X-Timestamp` where signature = HMAC_SHA256(`${rawBody}.${timestamp}`, secret)).
- Idempotent on `sepayTransactionId`.
- Match `paymentCode` + `amount` and transition order state: `pending → received → sold`.

## Cutover Checklist
1) Point Sepay webhook to `https://<ecommerce>/api/webhooks/sepay`.
2) Set Ecommerce env vars (`.env`).
3) Deploy Ecommerce. Ensure Warehouse webhook endpoint is live and returns 200.
4) Test real transfer with `PERF...` code in content. Verify Ecommerce logs and Warehouse order update.
5) Monitor and add retries/backoff if needed.

## Notes
- Keep Sepay keys only in Ecommerce. Warehouse holds only internal webhook secret.
- Do not log secrets or full payloads in production logs.
- For late/partial payments, add follow-up events (`order.refunded`, etc.) as needed.
