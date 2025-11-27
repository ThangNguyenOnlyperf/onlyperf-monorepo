import 'dotenv/config';
import https from 'node:https';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

class SimpleHeaders {
  constructor(private readonly map: Map<string, string>) {}

  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? null;
  }
}

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? new URL(input) : new URL(input.toString());
    const bodyString = typeof init?.body === 'string' ? init.body : undefined;

    const requestOptions: https.RequestOptions = {
      method: init?.method ?? 'GET',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: init?.headers as Record<string, string> | undefined,
    };

    return await new Promise<Response>((resolve, reject) => {
      const req = https.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf-8');
          const headers = new Map<string, string>();
          Object.entries(res.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              headers.set(key.toLowerCase(), value.join(', '));
            } else if (typeof value === 'string') {
              headers.set(key.toLowerCase(), value);
            }
          });

          const headersProxy = new SimpleHeaders(headers);

          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            headers: headersProxy as unknown as Headers,
            async text() {
              return responseBody;
            },
          } as unknown as Response);
        });
      });

      req.on('error', reject);

      if (bodyString) {
        req.write(bodyString);
      }

      req.end();
    });
  }) as typeof fetch;
}

import { env } from '~/env';
import * as schema from '~/server/db/schema';
import { createShopifyProductFromWarehouse } from '~/lib/shopify/products';

async function main() {
  const productId = process.argv[2];

  if (!productId || productId === '--help') {
    console.error('Usage: pnpm tsx scripts/sync-shopify-product.ts <productId>');
    process.exit(1);
  }

  const client = postgres(env.DATABASE_URL);
  const database = drizzle(client, { schema });

  try {
    const [product] = await database
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId))
      .limit(1);

    if (!product) {
      console.error(`Product ${productId} not found`);
      process.exitCode = 1;
      return;
    }

    const result = await createShopifyProductFromWarehouse(product, database);
    console.log('Shopify sync result:', result);
  } catch (error) {
    console.error('Shopify sync failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
