# Logging Implementation Plan

## Overview

This document outlines the logging solution for the warehouse management application. The implementation uses **Pino** as the core logging library, chosen for its performance, lightweight footprint, and excellent developer experience.

## Configuration Decisions

- **Log Retention**: 14 days (2 weeks)
- **Production Log Level**: `info`
- **Migration Strategy**: Full migration of all console.log calls
- **Compression**: Enabled (gzip for rotated logs)

---

## Why Pino?

### Key Benefits
- **Lightweight**: Only 6KB (vs Winston's 50KB)
- **Performance**: 5-10x faster than alternatives (handles 10,000+ logs/second)
- **Local-First**: Works entirely locally, no cloud services required
- **Built-in Rotation**: Via `pino-roll` package
- **Great DX**: `pino-pretty` CLI tool for beautiful development logs
- **Structured Logging**: JSON format by default, perfect for production
- **Active Maintenance**: Full Next.js 15 support

### The Stack
```
Pino (core logger) + pino-pretty (dev) + pino-roll (rotation)
```

---

## Comparison with Alternatives

| Feature | Pino | Winston | Bunyan | Debug |
|---------|------|---------|--------|-------|
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Size** | 6KB | 50KB | 15KB | 3KB |
| **Structured Logging** | ✅ | ✅ | ✅ | ❌ |
| **Log Rotation** | ✅ | ✅ | ✅ | ❌ |
| **Pretty CLI** | ✅ Excellent | ⚠️ Basic | ✅ Good | ❌ |
| **Next.js 15** | ✅ | ✅ | ⚠️ | ✅ |
| **Maintained** | ✅ | ✅ | ❌ | ✅ |
| **Production Ready** | ✅ | ✅ | ✅ | ❌ |

---

## Implementation Steps

### Step 1: Install Dependencies

```bash
pnpm add pino pino-roll rotating-file-stream
pnpm add -D pino-pretty
```

### Step 2: Update Next.js Configuration

```javascript
// next.config.js
module.exports = {
  serverExternalPackages: ['pino', 'pino-pretty', 'pino-roll'],

  // Optional: Enable Next.js built-in logging config
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

### Step 3: Create Logger Instance

Create `src/lib/logger.ts`:

```typescript
import pino from 'pino';
import rfs from 'rotating-file-stream';

const isDevelopment = process.env.NODE_ENV === 'development';

// Create rotating file stream for production
const createRotatingStream = () => {
  return rfs.createStream('app.log', {
    size: '10M',          // Rotate every 10MB
    interval: '1d',       // Or rotate daily (whichever comes first)
    path: './logs',       // Log directory
    maxFiles: 14,         // Keep 14 days of logs
    compress: 'gzip',     // Compress rotated logs
  });
};

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Development: Pretty print to console
  // Production: JSON to rotating file
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            messageFormat: '{levelLabel} - {msg}',
          },
        },
      }
    : {
        // In production, write to rotating file stream
      }),

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'apiKey',
      'api_key',
      'secret',
    ],
    remove: true,
  },

  // Base context
  base: {
    env: process.env.NODE_ENV,
  },
});

// For production, pipe to rotating stream
if (!isDevelopment) {
  const stream = createRotatingStream();
  logger.pipe(stream);
}

// Helper for child loggers with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

// Export logger instance as default
export default logger;
```

### Step 4: Environment Configuration

Add to `.env.local` (development):
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

Add to `.env.production`:
```bash
NODE_ENV=production
LOG_LEVEL=info
```

### Step 5: Create Log Directory

```bash
mkdir -p logs
echo "logs/*.log*" >> .gitignore
```

---

## Usage Patterns

### Basic Logging

```typescript
import { logger } from '~/lib/logger';

// Info level
logger.info('Server started');
logger.info({ port: 3000 }, 'Server listening on port 3000');

// Warning
logger.warn({ userId: '123' }, 'User attempted unauthorized access');

// Error
logger.error({ error, orderId }, 'Failed to process order');

// Debug (only in development or when LOG_LEVEL=debug)
logger.debug({ payload }, 'Received webhook payload');
```

### Server Actions

```typescript
// src/actions/orderActions.ts
'use server';

import { logger } from '~/lib/logger';
import { db } from '~/server/db';
import { orders } from '~/server/db/schema';

export async function createOrder(orderData: OrderData) {
  const orderLogger = logger.child({
    action: 'createOrder',
    customerId: orderData.customerId
  });

  orderLogger.info({ orderData }, 'Creating new order');

  try {
    const result = await db.insert(orders).values(orderData).returning();

    orderLogger.info(
      {
        orderId: result[0].id,
        orderNumber: result[0].orderNumber
      },
      'Order created successfully'
    );

    return { success: true, data: result[0] };

  } catch (error) {
    orderLogger.error(
      { error, orderData },
      'Failed to create order'
    );

    return {
      success: false,
      message: 'Lỗi khi tạo đơn hàng'
    };
  }
}
```

### API Routes

```typescript
// src/app/api/webhooks/shopify/orders/route.ts
import { NextResponse } from 'next/server';
import { logger } from '~/lib/logger';

export async function POST(request: Request) {
  const webhookLogger = logger.child({
    route: '/api/webhooks/shopify/orders',
    method: 'POST'
  });

  webhookLogger.info('Received Shopify webhook');

  try {
    const payload = await request.json();

    webhookLogger.debug({ payload }, 'Webhook payload received');

    // Verify signature
    const isValid = await verifyWebhook(request);
    if (!isValid) {
      webhookLogger.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process order
    const result = await processShopifyOrder(payload);

    webhookLogger.info(
      {
        shopifyOrderId: payload.id,
        warehouseOrderId: result.orderId
      },
      'Webhook processed successfully'
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    webhookLogger.error({ error }, 'Webhook processing failed');
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

### Performance Monitoring

```typescript
export async function slowDatabaseQuery() {
  const start = Date.now();

  try {
    const result = await db.query.products.findMany({
      // complex query
    });

    logger.info(
      {
        duration: Date.now() - start,
        operation: 'slowDatabaseQuery',
        recordCount: result.length
      },
      'Query completed'
    );

    return result;
  } catch (error) {
    logger.error(
      { error, duration: Date.now() - start },
      'Query failed'
    );
    throw error;
  }
}
```

### Child Loggers with Context

```typescript
// Create logger with persistent context
const inventoryLogger = logger.child({ module: 'inventory' });
const userLogger = logger.child({ userId: currentUser.id });

// All logs from these loggers will include the context
inventoryLogger.info('Stock updated');
// Output: {"module":"inventory","msg":"Stock updated",...}

userLogger.warn('Invalid operation attempted');
// Output: {"userId":"123","msg":"Invalid operation attempted",...}
```

---

## Migration Guide

### Files to Update (48 total)

The codebase currently has `console.log`, `console.error`, and `console.warn` in 48 files. Here's the migration strategy:

### Priority 1: Critical Paths (~1 hour)

1. **Webhook Handlers**
   - `src/app/api/webhooks/shopify/orders/route.ts`
   - Any SEPay webhook handlers

2. **Order Processing**
   - `src/actions/orderActions.ts`
   - `src/actions/outboundActions.ts`

3. **Shopify Integration**
   - `src/actions/shopify/orderWebhookActions.ts`
   - `src/actions/shopify/utils.ts`

4. **Authentication & Security**
   - `src/lib/security/hmac.ts`

### Priority 2: All Remaining Files (~2 hours)

Search and replace pattern:

```typescript
// Before:
console.log('Message', data);
console.error('Error:', error);
console.warn('Warning:', warning);

// After:
logger.info({ data }, 'Message');
logger.error({ error }, 'Error');
logger.warn({ warning }, 'Warning');
```

### Migration Commands

```bash
# Find all console.log usage
grep -r "console\." src/ --include="*.ts" --include="*.tsx"

# Or use ripgrep for better output
rg "console\.(log|error|warn|debug)" src/
```

---

## Development Workflow

### Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "dev:debug": "LOG_LEVEL=debug next dev --turbo",
    "logs:view": "tail -f logs/app.log | pino-pretty",
    "logs:errors": "grep '\"level\":50' logs/app.log | pino-pretty",
    "logs:clean": "rm -rf logs/*.log*"
  }
}
```

### Viewing Logs

**Development (automatic pretty printing)**:
```bash
pnpm dev
# Logs appear colorized in terminal
```

**Production (view log files)**:
```bash
# Real-time tail
pnpm logs:view

# View only errors
pnpm logs:errors

# View specific log file
cat logs/app.log | pino-pretty

# Search for specific order
grep "orderId.*ABC123" logs/app.log | pino-pretty
```

---

## Log Levels

Use appropriate log levels:

| Level | When to Use | Example |
|-------|-------------|---------|
| `trace` | Very detailed debugging | Request/response bodies, detailed state |
| `debug` | Development debugging | Function entries, intermediate values |
| `info` | **Important events** | Order created, payment processed, user login |
| `warn` | Recoverable issues | Invalid input, retry attempts, deprecations |
| `error` | Errors that need attention | Failed operations, exceptions |
| `fatal` | Critical failures | Database connection lost, app crash |

**Default Production Level**: `info` (captures info, warn, error, fatal)

---

## Best Practices

### ✅ DO

- Use structured logging with context objects
- Include relevant IDs (orderId, userId, transactionId)
- Log before and after critical operations
- Use child loggers for consistent context
- Redact sensitive information
- Use appropriate log levels
- Include error stack traces

```typescript
// Good
logger.info({ orderId: '123', total: 500 }, 'Order created');
logger.error({ error, orderId: '123' }, 'Payment processing failed');
```

### ❌ DON'T

- Don't log passwords, tokens, or sensitive data
- Don't use string concatenation for dynamic data
- Don't log entire request/response objects in production
- Don't use console.log in production code
- Don't log excessively in tight loops

```typescript
// Bad
console.log('Order ' + orderId + ' created');
logger.info(`Password: ${password}`); // NEVER!
```

### Security Considerations

Always redact these fields (already configured in logger):
- `password`
- `token`
- `authorization`
- `cookie`
- `apiKey`
- `secret`
- Any field containing PII without consent

---

## Monitoring & Alerts

### Current Setup
- Local file-based logging
- 14-day retention
- Daily rotation
- Gzip compression

### Future Enhancements (Optional)

1. **Error Alerting**
   - Set up email/Slack notifications for error-level logs
   - Use tools like PM2 or custom script to monitor logs

2. **Log Aggregation**
   - Consider Loki, Graylog, or ELK stack if logs grow
   - Pino's JSON format makes this easy to implement later

3. **Metrics Dashboard**
   - Build simple dashboard to visualize log metrics
   - Track error rates, response times, etc.

---

## Testing

### Test Logging in Development

```bash
# Start with debug logging
LOG_LEVEL=debug pnpm dev

# Test different log levels
LOG_LEVEL=trace pnpm dev
LOG_LEVEL=info pnpm dev
```

### Verify Log Rotation

```bash
# Check log directory
ls -lh logs/

# Should see files like:
# app.log (current)
# app.log.1 (yesterday)
# app.log.2.gz (2 days ago, compressed)
```

---

## Troubleshooting

### Logs Not Appearing

1. Check `LOG_LEVEL` environment variable
2. Verify `logs/` directory exists
3. Check file permissions
4. Ensure `pino` and `pino-roll` are installed

### Performance Issues

1. Reduce log level in production (`warn` or `error` only)
2. Avoid logging in tight loops
3. Use async logging (Pino default)

### Large Log Files

1. Reduce rotation size (currently 10MB)
2. Reduce retention days (currently 14)
3. Enable compression (already enabled)

---

## Cost Analysis

- **Installation**: Free (all open-source)
- **Maintenance**: ~15 minutes/week
- **Storage**: ~140-280MB for 14 days (with compression)
- **Performance Overhead**: <1% (Pino is extremely fast)

---

## Migration Timeline

### Phase 1: Setup (Day 1 - 30 minutes)
- [ ] Install dependencies
- [ ] Create logger instance
- [ ] Update next.config.js
- [ ] Create logs directory
- [ ] Add package.json scripts

### Phase 2: Critical Paths (Day 1-2 - 1 hour)
- [ ] Migrate webhook handlers
- [ ] Migrate order processing
- [ ] Migrate payment processing
- [ ] Migrate Shopify integration

### Phase 3: Complete Migration (Day 2-3 - 2 hours)
- [ ] Replace all console.log calls (48 files)
- [ ] Add structured context to logs
- [ ] Test in development
- [ ] Verify log rotation

### Phase 4: Production Deploy (Day 3)
- [ ] Test in production environment
- [ ] Monitor log files
- [ ] Adjust log levels as needed
- [ ] Set up log monitoring routine

**Total Estimated Time**: ~3-4 hours

---

## Resources

- [Pino Documentation](https://getpino.io/)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
- [Next.js Logging Guide](https://nextjs.org/docs/app/building-your-application/optimizing/logging)

---

## Questions & Support

For questions or issues:
1. Check Pino documentation
2. Review this implementation guide
3. Check logs with `pnpm logs:view`
4. Test in development with `LOG_LEVEL=debug`

---

**Last Updated**: 2025-11-05
**Status**: Ready for implementation

