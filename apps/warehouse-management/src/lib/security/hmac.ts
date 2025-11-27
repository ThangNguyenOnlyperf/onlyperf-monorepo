import crypto from "crypto";
import { logger } from "~/lib/logger";

/**
 * Sign a body string with HMAC SHA256
 */
export function signBodyHmacSha256(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Build signed headers for outgoing webhook requests
 * Used when warehouse sends webhooks to external services
 */
export function buildSignedHeaders(body: unknown, secret: string) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBodyHmacSha256(`${raw}.${timestamp}`, secret);

  return { signature, timestamp, raw };
}

/**
 * Verify HMAC signature for incoming webhook requests
 * Used to validate webhooks from onlyperf/Shopify
 *
 * @param body - Raw request body string
 * @param signature - Signature from X-Signature header
 * @param timestamp - Timestamp from X-Timestamp header
 * @param secret - Shared secret for verification
 * @param maxAge - Maximum age of signature in seconds (default: 300 = 5 minutes)
 */
export function verifyHmacSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
  maxAge: number = 300
): boolean {
  try {
    // Verify timestamp to prevent replay attacks
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime)) {
      logger.warn({ timestamp }, "HMAC verification failed: Invalid timestamp format");
      return false;
    }

    if (now - requestTime > maxAge) {
      logger.warn({ requestTime, currentTime: now, ageSeconds: now - requestTime, maxAge }, "HMAC verification failed: Signature expired");
      return false;
    }

    // Compute expected signature
    const expectedSignature = signBodyHmacSha256(`${body}.${timestamp}`, secret);

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error({ error }, "Error verifying HMAC signature");
    return false;
  }
}

/**
 * Convenience function to verify webhook request
 * Extracts headers and body, then calls verifyHmacSignature
 */
export async function verifyWebhookRequest(
  request: Request,
  secret: string
): Promise<{ valid: boolean; body?: string; error?: string }> {
  try {
    const signature = request.headers.get("X-Signature");
    const timestamp = request.headers.get("X-Timestamp");

    if (!signature || !timestamp) {
      return {
        valid: false,
        error: "Missing X-Signature or X-Timestamp header"
      };
    }

    const body = await request.text();

    if (!body) {
      return {
        valid: false,
        error: "Empty request body"
      };
    }

    const valid = verifyHmacSignature(body, signature, timestamp, secret);

    if (!valid) {
      return {
        valid: false,
        error: "Invalid HMAC signature or expired timestamp"
      };
    }

    return { valid: true, body };
  } catch (error) {
    logger.error({ error }, "Error in webhook verification process");
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
