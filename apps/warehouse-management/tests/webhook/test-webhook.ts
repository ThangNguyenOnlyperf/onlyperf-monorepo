/**
 * Webhook Testing Script
 *
 * Directly test the Shopify order webhook without going through the full
 * Sepay → OnlyPerf → Warehouse flow.
 *
 * Usage:
 *   pnpm tsx tests/webhook/test-webhook.ts
 *   pnpm tsx tests/webhook/test-webhook.ts payloads/missing-sku.json
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Get __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(process.cwd(), ".env") });

// Load environment variables
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/shopify/orders";
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error("❌ Error: SHOPIFY_WEBHOOK_SECRET not found in .env");
  console.error("   Add it to your .env file:");
  console.error("   SHOPIFY_WEBHOOK_SECRET=your-secret-here");
  process.exit(1);
}

// HMAC signing function (matches onlyperf implementation)
function signBodyHmacSha256(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function buildSignedHeaders(body: unknown, secret: string) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBodyHmacSha256(`${raw}.${timestamp}`, secret);

  return { signature, timestamp, raw };
}

// Load payload from file or use default
function loadPayload(): any {
  const customPayloadPath = process.argv[2];
  const defaultPayloadPath = path.join(__dirname, "test-order-payload.json");

  const payloadPath = customPayloadPath ?? defaultPayloadPath;

  if (!fs.existsSync(payloadPath)) {
    console.error(`❌ Error: Payload file not found: ${payloadPath}`);
    console.error("");
    console.error("Usage:");
    console.error("  pnpm tsx tests/webhook/test-webhook.ts                           # Use default payload");
    console.error("  pnpm tsx tests/webhook/test-webhook.ts payloads/missing-sku.json # Use specific test case");
    console.error("  pnpm tsx tests/webhook/test-webhook.ts my-custom.json            # Use custom payload");
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(payloadPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error: Failed to parse JSON from ${payloadPath}`);
    console.error(error);
    process.exit(1);
  }
}

async function testWebhook() {
  console.log("🧪 Warehouse Webhook Tester");
  console.log("═══════════════════════════════════════════════");
  console.log("");

  // Load payload
  const payload = loadPayload();
  console.log(`📦 Loaded payload:`);
  console.log(`   Event: ${payload.event}`);
  console.log(`   Shopify Order: ${payload.shopifyOrderNumber} (${payload.shopifyOrderId})`);
  console.log(`   Items: ${payload.lineItems?.length ?? 0}`);
  console.log(`   Amount: ${payload.amount?.toLocaleString()} ${payload.currency}`);
  console.log("");

  // Generate HMAC signature (WEBHOOK_SECRET is guaranteed to exist due to early exit check)
  const { signature, timestamp, raw } = buildSignedHeaders(payload, WEBHOOK_SECRET!);

  console.log(`🔐 Security:`);
  console.log(`   Signature: ${signature.substring(0, 20)}...`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log("");

  console.log(`🌐 Sending POST to: ${WEBHOOK_URL}`);
  console.log("");

  try {
    const startTime = Date.now();

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Timestamp": timestamp,
      },
      body: raw,
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`⏱️  Response time: ${duration}ms`);
    console.log("");

    if (response.ok) {
      console.log("✅ SUCCESS!");
      console.log("───────────────────────────────────────────────");
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log("");
      console.log("Response:");
      console.log(JSON.stringify(responseData, null, 2));
      console.log("");
      console.log("✅ Warehouse order created successfully!");

      if (responseData.warehouseOrderNumber) {
        console.log(`   Order Number: ${responseData.warehouseOrderNumber}`);
        console.log(`   Order ID: ${responseData.warehouseOrderId}`);
        console.log(`   Items Fulfilled: ${responseData.itemsFulfilled}`);
      }
    } else {
      console.log("❌ FAILED!");
      console.log("───────────────────────────────────────────────");
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log("");
      console.log("Response:");
      console.log(JSON.stringify(responseData, null, 2));
      console.log("");

      // Parse error details
      if (responseData.code === "MISSING_SKU") {
        console.log("💡 Issue: Products not found in warehouse");
        console.log(`   Missing SKUs: ${responseData.details?.missingSKUs?.join(", ")}`);
        console.log("");
        console.log("   Fix: Add these products to warehouse or update SKUs in payload");
      } else if (responseData.code === "INSUFFICIENT_INVENTORY") {
        console.log("💡 Issue: Not enough inventory");
        console.log(`   Insufficient: ${responseData.details?.insufficientProducts?.join(", ")}`);
        console.log("");
        console.log("   Fix: Add more inventory or reduce quantities in payload");
      } else if (response.status === 401) {
        console.log("💡 Issue: Invalid HMAC signature");
        console.log("");
        console.log("   Fix: Ensure SHOPIFY_WEBHOOK_SECRET matches in both .env files");
      }
    }

  } catch (error) {
    console.log("❌ ERROR!");
    console.log("───────────────────────────────────────────────");

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.log("💡 Issue: Cannot connect to webhook server");
        console.log("");
        console.log("   Fix: Start the warehouse dev server:");
        console.log("   $ pnpm dev");
      } else {
        console.log(`Error: ${error.message}`);
      }
    } else {
      console.log(error);
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════════════");
}

// Run the test
testWebhook().catch(console.error);
