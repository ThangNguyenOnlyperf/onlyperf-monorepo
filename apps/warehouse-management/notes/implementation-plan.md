# QR Code Generation from Receipt - Implementation Plan

## Overview
This document outlines the implementation of a QR code generation system for warehouse management, focusing on mobile-first design for warehouse staff using gloved hands.

## 1. Database Schema Updates

### Products Table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Shipments Table
```sql
CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Shipment Items Table
```sql
CREATE TABLE shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. Home Page with Floating Action Button

### Design Requirements
- Blank home page with minimal UI
- Floating Action Button (FAB) positioned at bottom-right
- FAB expands to show 3 options:
  - **Nhập kho** (Inbound)
  - **Xuất kho** (Outbound)
  - **Lô hàng mới** (New Shipment)
- Touch targets minimum 44px for gloved hands
- Smooth animations using react-floating-buttons

### Implementation
```typescript
// Using react-floating-buttons library
<FloatingButton
  buttonType="plus"
  size={60} // Larger size for gloved hands
  backgroundColor="#0066CC"
  onClick={() => setIsOpen(!isOpen)}
>
  <FloatingButton.Item
    icon={<Package />}
    label="Lô hàng mới"
    onClick={() => router.push('/shipments/new')}
  />
  <FloatingButton.Item
    icon={<ArrowDownToLine />}
    label="Nhập kho"
    onClick={() => router.push('/inbound')}
  />
  <FloatingButton.Item
    icon={<ArrowUpFromLine />}
    label="Xuất kho"
    onClick={() => router.push('/outbound')}
  />
</FloatingButton>
```

## 3. New Shipment Form Screen

### Form Structure
- **Header Section**:
  - Receipt Number (required)
  - Receipt Date (required)
  - Supplier Name (required)

- **Products Section**:
  - Dynamic list of product entries
  - Each entry contains:
    - Brand dropdown (mock data)
    - Model dropdown (filtered by brand)
    - Quantity input
    - Remove button
  - Add Product button (Plus icon)

### Mock Data Structure
```typescript
const mockBrands = [
  { id: '1', name: 'Nike' },
  { id: '2', name: 'Adidas' },
  { id: '3', name: 'Puma' },
  { id: '4', name: 'Reebok' },
];

const mockModels = {
  '1': [
    { id: '1-1', name: 'Air Max 90' },
    { id: '1-2', name: 'Air Force 1' },
    { id: '1-3', name: 'Blazer Mid' },
  ],
  '2': [
    { id: '2-1', name: 'Ultraboost' },
    { id: '2-2', name: 'Stan Smith' },
    { id: '2-3', name: 'Superstar' },
  ],
  // ... more models
};
```

## 4. QR Code Generation Strategy

### QR Code Specifications
- **Size**: 2.5cm x 2.5cm (95px x 95px at 96 DPI)
- **DPI**: 300 minimum for printing
- **Error Correction**: Level Q (25%) for moisture/wear resistance
- **Content**: Shortened URL format `https://inv.co/p/{code}`
- **For curved surfaces**: Increase size by 25-50%

### Implementation
```typescript
import QRCode from 'qrcode';

const generateQRCode = async (data: string): Promise<string> => {
  const options = {
    errorCorrectionLevel: 'Q',
    type: 'image/png',
    width: 295, // 2.5cm at 300 DPI
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };
  
  return await QRCode.toDataURL(data, options);
};
```

## 5. PDF Generation with Worker Threads

### PDF Template Design
- A4 paper size
- Grid layout: 4x6 QR codes per page
- Each QR code with label beneath
- Margins for easy cutting

### Worker Thread Implementation
```typescript
// workers/pdf-worker.js
const { parentPort } = require('worker_threads');
const ReactPDF = require('@react-pdf/renderer');

parentPort.on('message', async (data) => {
  try {
    const pdf = await ReactPDF.renderToBuffer(<PDFTemplate {...data} />);
    parentPort.postMessage({ success: true, pdf });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});

// Main thread
const pool = workerpool.pool('./workers/pdf-worker.js', {
  minWorkers: 2,
  maxWorkers: os.cpus().length - 1,
});

const generatePDF = async (data) => {
  return await pool.exec('generatePDF', [data]);
};
```

## 6. Mobile Optimization

### Touch Target Guidelines
- Minimum touch target: 44px x 44px
- Spacing between targets: 8px minimum
- Form inputs: 56px height
- Buttons: 48px minimum height

### Performance Optimizations
- Lazy load QR Scanner component
- Use Web Workers for QR code generation
- Implement virtual scrolling for long product lists
- Cache generated QR codes

## 7. API Endpoints

### POST /api/shipments
Creates a new shipment with products

### GET /api/shipments/:id/pdf
Generates and returns PDF with QR codes

### POST /api/qr/scan
Processes scanned QR code

## 8. Testing Considerations

### Mobile Testing
- Test on actual devices with gloves
- Test QR code scanning in various lighting conditions
- Test PDF generation performance with large batches
- Test offline functionality

### Performance Benchmarks
- PDF generation: < 2s for 100 QR codes
- QR code scanning: < 500ms detection time
- Form submission: < 1s response time