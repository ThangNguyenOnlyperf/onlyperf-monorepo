# Badge Sheet Generation

This repository includes a script that composes a printable PDF sheet filled with BT Sports badges. Each badge receives a QR code rendered inside the placeholder box of the base artwork.

## Prerequisites

- The base badge artwork: `public/onlyperf/BT-Sport-badge.png`
- Dependencies installed via `pnpm install`

## Generate the sheet

```bash
pnpm exec tsx scripts/generate-badge-sheet.ts
```

The script writes `public/onlyperf/badge-sheet.pdf` and logs the number of badges placed on the page.

## Adjusting layout or data

Edit `scripts/generate-badge-sheet.ts` to tweak:

- Badge dimensions, QR position, or target width (`config.badge`)
- Page size, margins, and spacing (`config.page`)
- QR styling (`config.qr`)
- Placeholder values for QR content (`labels` array)

The defaults fill a landscape A4 page (300 DPI equivalent) with 136 badges whose QR content is `BT-0001`, `BT-0002`, …
