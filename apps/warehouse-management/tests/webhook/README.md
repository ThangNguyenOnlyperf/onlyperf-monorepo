# Webhook Testing

Quick testing tools for the Shopify order webhook integration.

## Files

- **`test-webhook.ts`** - Main test script that sends signed HTTP requests to the webhook
- **`test-order-payload.json`** - Default test payload (single item order)
- **`payloads/`** - Additional test scenarios
  - `missing-sku.json` - Tests missing product error handling
  - `multi-item.json` - Tests multiple items in one order
  - `README.md` - Detailed documentation on test payloads
- **`TEST_QUICK_START.md`** - Quick start guide for testing

## Quick Start

```bash
# From project root, run:
pnpm tsx tests/webhook/test-webhook.ts
```

See [`TEST_QUICK_START.md`](./TEST_QUICK_START.md) for full testing guide.

## Why This Exists

Testing the full Sepay → OnlyPerf → Warehouse flow takes 5+ minutes per iteration. This testing suite allows you to:

- ⚡ Test webhook in ~10 seconds
- 🧪 Test error scenarios (missing SKU, insufficient inventory)
- 🔄 Iterate quickly on webhook logic
- 📝 No need for ngrok during development

## Usage Examples

```bash
# Use default payload
pnpm tsx tests/webhook/test-webhook.ts

# Test missing SKU error
pnpm tsx tests/webhook/test-webhook.ts payloads/missing-sku.json

# Test multi-item order
pnpm tsx tests/webhook/test-webhook.ts payloads/multi-item.json

# Use custom payload
pnpm tsx tests/webhook/test-webhook.ts my-custom-payload.json
```

## Requirements

1. Warehouse dev server running (`pnpm dev`)
2. `SHOPIFY_WEBHOOK_SECRET` in `.env`

## Documentation

- Full integration guide: [`SHOPIFY_INTEGRATION.md`](../../SHOPIFY_INTEGRATION.md) (project root)
- Testing guide: [`TEST_QUICK_START.md`](./TEST_QUICK_START.md)
- Payload documentation: [`payloads/README.md`](./payloads/README.md)

...