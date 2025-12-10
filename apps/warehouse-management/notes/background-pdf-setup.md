# Background PDF Generation with Upstash QStash + Google Drive

## Overview

When generating PDFs with 1,000+ QR codes, synchronous generation can timeout or hang on resource-constrained servers. This guide sets up background processing using:

- **Upstash QStash** - Serverless message queue (free: 1,000 messages/day)
- **Google Drive** - PDF storage (free: 15GB)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. POST /api/pdf/queue                                         │
│     - Validates request                                         │
│     - Creates job record in DB (status: 'pending')              │
│     - Queues message to QStash                                  │
│     - Returns jobId immediately                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. QStash delivers message to:                                 │
│     POST /api/pdf/worker                                        │
│     - Generates PDF (can take 30-60 seconds)                    │
│     - Uploads to Google Drive                                   │
│     - Updates job record (status: 'completed', driveUrl: ...)   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. GET /api/pdf/status/:jobId                                  │
│     - User polls for status                                     │
│     - Returns driveUrl when complete                            │
└─────────────────────────────────────────────────────────────────┘
```

### Cost

| Service | Free Tier | Your Usage |
|---------|-----------|------------|
| Upstash QStash | 1,000 messages/day | ~10-50 PDFs/day |
| Google Drive | 15GB | ~150,000 PDFs (100KB each) |
| **Total** | **$0** | **$0** |

---

## Prerequisites

1. [Upstash account](https://upstash.com) (free)
2. [Google Cloud Console](https://console.cloud.google.com) project
3. Google Drive folder to store PDFs

---

## Step 1: Upstash QStash Setup

### 1.1 Create Upstash Account

1. Go to [upstash.com](https://upstash.com)
2. Sign up (GitHub/Google/Email)
3. Navigate to **QStash** tab

### 1.2 Get Credentials

From the QStash dashboard, copy:

- `QSTASH_TOKEN` - For publishing messages
- `QSTASH_CURRENT_SIGNING_KEY` - For verifying incoming requests
- `QSTASH_NEXT_SIGNING_KEY` - For key rotation

### 1.3 Add to Environment

```bash
# .env.local
QSTASH_TOKEN=ey...
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...
```

---

## Step 2: Google Drive API Setup

### 2.1 Create GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Google Drive API**:
   - APIs & Services → Library → Search "Google Drive API" → Enable

### 2.2 Create Service Account

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Name: `pdf-uploader` (or any name)
4. Click **Create and Continue** → Skip optional steps → **Done**

### 2.3 Generate Key

1. Click on the service account you created
2. Go to **Keys** tab
3. **Add Key → Create new key → JSON**
4. Download the JSON file

### 2.4 Extract Credentials

From the downloaded JSON, you need:

```json
{
  "client_email": "pdf-uploader@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Add to environment:

```bash
# .env.local
GOOGLE_SERVICE_ACCOUNT_EMAIL=pdf-uploader@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Note:** The private key must be in quotes and keep the `\n` characters.

### 2.5 Create & Share Drive Folder

1. Go to [Google Drive](https://drive.google.com)
2. Create a folder for PDFs (e.g., "Warehouse PDFs")
3. Right-click → **Share**
4. Add the service account email (e.g., `pdf-uploader@your-project.iam.gserviceaccount.com`)
5. Set permission to **Editor**
6. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/1ABC123xyz
                                          └─────────┘
                                          This is the folder ID
   ```

```bash
# .env.local
GOOGLE_DRIVE_FOLDER_ID=1ABC123xyz
```

---

## Step 3: Install Dependencies

```bash
pnpm add @upstash/qstash googleapis
```

---

## Step 4: Implementation

### 4.1 Environment Schema

Add to `src/env.js`:

```typescript
// Add to server schema
QSTASH_TOKEN: z.string().min(1),
QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
QSTASH_NEXT_SIGNING_KEY: z.string().min(1),
GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
GOOGLE_PRIVATE_KEY: z.string().min(1),
GOOGLE_DRIVE_FOLDER_ID: z.string().min(1),
```

### 4.2 Google Drive Upload Utility

Create `src/lib/google-drive.ts`:

```typescript
import { google } from 'googleapis';
import { Readable } from 'stream';
import { env } from '~/env';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadPDFToDrive(
  buffer: Buffer,
  filename: string
): Promise<{ fileId: string; webViewLink: string }> {
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: 'application/pdf',
      parents: [env.GOOGLE_DRIVE_FOLDER_ID],
    },
    media: {
      mimeType: 'application/pdf',
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink',
  });

  // Make file accessible via link
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
  };
}
```

### 4.3 QStash Client

Create `src/lib/qstash.ts`:

```typescript
import { Client } from '@upstash/qstash';
import { env } from '~/env';

export const qstash = new Client({
  token: env.QSTASH_TOKEN,
});
```

### 4.4 Database Schema for Jobs

Add to your schema:

```typescript
export const pdfJobs = pgTable('pdf_jobs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  shipmentId: text('shipment_id').notNull(),
  productId: text('product_id'),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  driveFileId: text('drive_file_id'),
  driveUrl: text('drive_url'),
  errorMessage: text('error_message'),
  itemCount: integer('item_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});
```

### 4.5 Queue Endpoint

Create `src/app/api/pdf/queue/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { pdfJobs } from '~/server/db/schema';
import { qstash } from '~/lib/qstash';
import { requireOrgContext } from '~/lib/authorization';
import { env } from '~/env';

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrgContext();
    const { shipmentId, productId } = await request.json();

    // Create job record
    const jobId = `job_${Date.now()}`;
    await db.insert(pdfJobs).values({
      id: jobId,
      organizationId,
      shipmentId,
      productId,
      status: 'pending',
    });

    // Queue background job
    const baseUrl = env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';
    await qstash.publishJSON({
      url: `${baseUrl}/api/pdf/worker`,
      body: {
        jobId,
        shipmentId,
        productId,
        organizationId,
      },
      retries: 3,
    });

    return NextResponse.json({ jobId, status: 'queued' });
  } catch (error) {
    console.error('Failed to queue PDF job:', error);
    return NextResponse.json(
      { error: 'Failed to queue PDF generation' },
      { status: 500 }
    );
  }
}
```

### 4.6 Worker Endpoint

Create `src/app/api/pdf/worker/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { db } from '~/server/db';
import { pdfJobs, shipmentItems, products } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateTemplatePDFWithQRCodes } from '~/lib/pdf-template-overlay';
import { uploadPDFToDrive } from '~/lib/google-drive';

async function handler(request: NextRequest) {
  try {
    const { jobId, shipmentId, productId, organizationId } = await request.json();

    // Update status to processing
    await db
      .update(pdfJobs)
      .set({ status: 'processing' })
      .where(eq(pdfJobs.id, jobId));

    // Fetch items for PDF
    const conditions = [
      eq(shipmentItems.shipmentId, shipmentId),
      eq(shipmentItems.organizationId, organizationId),
    ];
    if (productId) {
      conditions.push(eq(shipmentItems.productId, productId));
    }

    const items = await db
      .select({
        qrCode: shipmentItems.qrCode,
        productName: products.name,
      })
      .from(shipmentItems)
      .leftJoin(products, eq(shipmentItems.productId, products.id))
      .where(and(...conditions));

    const qrItems = items
      .filter((item) => item.qrCode)
      .map((item) => ({
        url: `https://onlyperf.com/p/${item.qrCode}`,
        label: item.productName || '',
      }));

    // Generate PDF
    const pdfBuffer = await generateTemplatePDFWithQRCodes(qrItems);

    // Upload to Google Drive
    const filename = `shipment-${shipmentId}-${productId || 'all'}-${Date.now()}.pdf`;
    const { fileId, webViewLink } = await uploadPDFToDrive(
      Buffer.from(pdfBuffer),
      filename
    );

    // Update job as completed
    await db
      .update(pdfJobs)
      .set({
        status: 'completed',
        driveFileId: fileId,
        driveUrl: webViewLink,
        itemCount: qrItems.length,
        completedAt: new Date(),
      })
      .where(eq(pdfJobs.id, jobId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PDF worker error:', error);

    // Try to update job as failed
    try {
      const { jobId } = await request.clone().json();
      await db
        .update(pdfJobs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(pdfJobs.id, jobId));
    } catch {}

    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Verify request is from QStash
export const POST = verifySignatureAppRouter(handler);
```

### 4.7 Status Endpoint

Create `src/app/api/pdf/status/[jobId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '~/server/db';
import { pdfJobs } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireOrgContext } from '~/lib/authorization';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { organizationId } = await requireOrgContext();
    const { jobId } = params;

    const [job] = await db
      .select()
      .from(pdfJobs)
      .where(and(
        eq(pdfJobs.id, jobId),
        eq(pdfJobs.organizationId, organizationId)
      ))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      driveUrl: job.driveUrl,
      itemCount: job.itemCount,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
```

---

## Step 5: Frontend Integration

### 5.1 Queue PDF and Poll Status

```typescript
async function generateLargePDF(shipmentId: string, productId?: string) {
  // Queue the job
  const queueResponse = await fetch('/api/pdf/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId, productId }),
  });
  const { jobId } = await queueResponse.json();

  // Poll for status
  let status = 'pending';
  let driveUrl = null;

  while (status === 'pending' || status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s

    const statusResponse = await fetch(`/api/pdf/status/${jobId}`);
    const job = await statusResponse.json();

    status = job.status;
    driveUrl = job.driveUrl;

    // Update UI with progress
    updateProgress(status, job.itemCount);
  }

  if (status === 'completed' && driveUrl) {
    window.open(driveUrl, '_blank');
  } else if (status === 'failed') {
    toast.error('PDF generation failed');
  }
}
```

---

## Step 6: Testing

### 6.1 Test QStash Locally

QStash needs a public URL. For local development, use:

```bash
# Install ngrok
brew install ngrok

# Expose local server
ngrok http 3000
```

Use the ngrok URL as your `NEXT_PUBLIC_BASE_URL` during testing.

### 6.2 Test Google Drive Upload

```typescript
// Test script
import { uploadPDFToDrive } from './src/lib/google-drive';

const testBuffer = Buffer.from('test PDF content');
const result = await uploadPDFToDrive(testBuffer, 'test.pdf');
console.log('Uploaded:', result.webViewLink);
```

---

## Monitoring

### QStash Dashboard

- View queued/delivered/failed messages at [console.upstash.com](https://console.upstash.com)
- Set up failure notifications

### Database Job Status

Query failed jobs:

```sql
SELECT * FROM pdf_jobs WHERE status = 'failed' ORDER BY created_at DESC;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QStash signature verification fails | Check `QSTASH_CURRENT_SIGNING_KEY` is correct |
| Google Drive upload fails | Verify service account has Editor access to folder |
| PDF generation timeout | Increase QStash timeout or use pagination |
| Job stuck in "processing" | Check worker logs, may need to manually reset |

---

## Security Notes

1. **Never commit credentials** - Use `.env.local` (gitignored)
2. **QStash verification** - Always use `verifySignatureAppRouter` on worker endpoints
3. **Organization isolation** - Always filter by `organizationId` in queries
4. **Drive permissions** - Use "anyone with link" for customer access, or implement per-user sharing
