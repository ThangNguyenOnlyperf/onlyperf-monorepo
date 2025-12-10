# QR Pool + Wholesale Bundle Assembly - Implementation Checklist

## Overview

System for pre-generating generic QR codes and binding them to products during warehouse assembly.

**Key flow:**
```
Generate QRs → qrPool (unbound)
        ↓
Assembly scan → bind to product + bundle → inventory item
        ↓
Track lifecycle: in_stock → allocated → sold → shipped
```

---

## Phase 1: Database Schema

- [x] Add `qrPool` table (pre-printed stickers)
- [x] Add `inventory` table (replaces shipmentItems for balls)
- [x] Add `bundles` table (wholesale groupings)
- [x] Add `bundleItems` table (links bundles to products)
- [x] Add relations for new tables
- [x] Run `pnpm db:push`

**Files modified:**
- `packages/db/src/schema.ts`

---

## Phase 2: QR Pool Feature

- [x] Create `qrPoolActions.ts`
  - [x] `generateQRPoolBatchAction(count)`
  - [x] `getQRPoolStatsAction()`
  - [x] `getQRPoolListAction(filters, pagination)`
  - [x] `getQRBatchesAction()`
  - [x] `getQRPoolItemAction(qrCode)`
- [x] Create `/qr-pool` page route
- [x] Create `QRPoolClientUI.tsx`
  - [x] Stats cards (available/used/total)
  - [x] Generate QR batch dialog
  - [x] Batch history table
- [x] Add QR Pool to sidebar navigation

**Files created:**
- `src/actions/qrPoolActions.ts`
- `src/app/(authenticated)/qr-pool/page.tsx`
- `src/components/qr-pool/QRPoolClientUI.tsx`

---

## Phase 3: Inventory Feature

- [x] Create `inventoryActions.ts`
  - [x] `getInventoryAction(filters, pagination)`
  - [x] `getInventoryItemAction(qrCode)`
  - [x] `updateInventoryStatusAction(qrCode, status)`
  - [x] `createInventoryItemAction(data)`
- [x] Create `/inventory` page route
- [x] Create `InventoryClientUI.tsx`
  - [x] Filter by status, product, bundle
  - [x] Inventory table with search
  - [x] Item detail modal

---

## Phase 4: Bundle Management

- [x] Create `bundleActions.ts`
  - [x] `createBundleAction({ name, items })`
  - [x] `getBundlesAction(filters, pagination)`
  - [x] `getBundleDetailAction(bundleId)`
  - [x] `deleteBundleAction(bundleId)`
- [x] Create `/bundles` page route
- [x] Create `/bundles/new` page route
- [x] Create `BundleListClientUI.tsx`
- [x] Create `CreateBundleClientUI.tsx`
  - [x] Product selection (multi-select existing products)
  - [x] Expected count per product
  - [x] Phase ordering
- [x] Create `BundleDetailClientUI.tsx`
  - [x] Show bundleItems with progress
  - [x] Show linked inventory items
  - [x] Start assembly button

---

## Phase 5: Assembly Session

- [x] Create `assemblyActions.ts`
  - [x] `startAssemblySessionAction(bundleQRCode)`
  - [x] `scanAssemblyQRAction(bundleId, packQRCode)`
  - [x] `confirmPhaseTransitionAction(bundleId)`
  - [x] `completeAssemblyAction(bundleId)`
- [x] Create `/bundles/[id]/assembly` page route
- [x] Create `AssemblyClientUI.tsx`
  - [x] Phase state machine
  - [x] Scanner integration
  - [x] Progress display
- [x] Create `PhaseIndicator.tsx`
  - [x] Blue phase banner
  - [x] Green phase banner
  - [x] Transition state
- [x] Create `PhaseTransitionModal.tsx`
- [x] Create `CountVerificationModal.tsx`

---

## Phase 6: Audio Feedback

- [x] Add phase tones to `audio-feedback.ts`
  - [x] `playBluePhaseTone()` - 659Hz "beep"
  - [x] `playGreenPhaseTone()` - 523Hz "boop"
  - [x] `playTransitionTone()` - two-tone
  - [x] `playCompletionFanfare()` - three ascending tones

---

## Phase 7: Polish & Integration

- [x] Add sidebar navigation
  - [x] QR Pool link
  - [x] Bundles link
  - [x] Inventory link
- [ ] Test on mobile devices
- [x] Vietnamese translations (already done in UI)

---

## Future (Not MVP)

- [ ] Migrate outbound/fulfillment to use `inventory` table
- [ ] Remove legacy pack fields from `products`:
  - [ ] `isPackProduct`
  - [ ] `packSize`
  - [ ] `baseProductId`
- [ ] Deprecate `shipmentItems` table
- [ ] Add pause/resume assembly sessions
- [ ] Add lot tracking for recalls

---

## Summary

| Phase | Status | Progress |
|-------|--------|----------|
| 1. Database Schema | ✅ Done | 6/6 |
| 2. QR Pool | ✅ Done | 7/7 |
| 3. Inventory | ✅ Done | 7/7 |
| 4. Bundle Management | ✅ Done | 10/10 |
| 5. Assembly Session | ✅ Done | 10/10 |
| 6. Audio Feedback | ✅ Done | 5/5 |
| 7. Polish | 🔄 In Progress | 2/3 |

**Overall: ~95% complete**
