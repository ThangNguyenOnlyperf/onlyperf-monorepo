# QR Code Specifications for Warehouse Management

## Physical Specifications

### Standard QR Code Size
- **Optimal Size**: 2.5cm x 2.5cm
- **Print Resolution**: 300 DPI minimum
- **Digital Size**: 295px x 295px (at 300 DPI)
- **Quiet Zone**: 4 module widths on all sides

### Curved Surface Adjustments
- **Size Increase**: 25-50% larger than standard
- **Adjusted Size**: 3.125cm - 3.75cm
- **Digital Size**: 369px - 443px (at 300 DPI)

## Technical Specifications

### Error Correction Levels
- **Level Q (25%)**: Recommended for warehouse environment
  - Handles moisture, wear, and partial damage
  - Suitable for labels that may get dirty or scratched
  - Best balance between redundancy and data capacity

### Data Encoding
- **URL Format**: `https://inv.co/p/{PRODUCT_CODE}`
- **Product Code Format**: `PB{YYMMDD}{SEQUENCE}`
  - Example: `PB24122501` (First product on Dec 25, 2024)
- **Maximum URL Length**: 50 characters

## Printing Guidelines

### Label Material
- **Recommended**: Waterproof synthetic labels
- **Adhesive**: Industrial-grade, moisture-resistant
- **Finish**: Matte (reduces glare for scanning)

### Printer Settings
- **Resolution**: 300 DPI minimum
- **Color Mode**: Black and white (higher contrast)
- **Print Quality**: High/Best

## Scanning Optimization

### Environmental Considerations
- **Lighting**: Works in 100-10,000 lux
- **Angle Tolerance**: ±45 degrees
- **Distance**: 10-50cm optimal scanning distance

### Mobile Device Requirements
- **Camera**: 5MP minimum
- **Autofocus**: Required
- **Flash**: Optional (may cause glare)

## Implementation Guidelines

### QR Code Generation
```javascript
const qrOptions = {
  errorCorrectionLevel: 'Q',
  type: 'image/png',
  width: 295,
  margin: 4, // Quiet zone
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  rendererOpts: {
    quality: 1 // Highest quality
  }
};
```

### Batch Generation Performance
- **Target**: Generate 100 QR codes in < 2 seconds
- **Memory Usage**: < 100MB for 1000 QR codes
- **Parallel Processing**: Use worker threads for batches > 50

## Testing Requirements

### Quality Assurance
1. **Print Test**: Print sample batch and scan with multiple devices
2. **Durability Test**: Test scanning after exposure to:
   - Water/moisture
   - Dust/dirt
   - Physical wear (rubbing)
3. **Distance Test**: Verify scanning at various distances
4. **Angle Test**: Verify scanning at various angles

### Performance Metrics
- **First Read Rate**: > 95%
- **Average Scan Time**: < 500ms
- **False Positive Rate**: < 0.01%

## PDF Layout Specifications

### Page Setup
- **Paper Size**: A4 (210mm x 297mm)
- **Orientation**: Portrait
- **Margins**: 10mm all sides

### Grid Layout
- **Columns**: 4
- **Rows**: 6
- **Total per page**: 24 QR codes
- **Spacing**: 5mm between codes

### Label Information
- **Position**: Below each QR code
- **Font Size**: 8pt
- **Content**: Product code + Brand/Model

## Integration with Nimiq QR-Scanner

### Configuration
```javascript
const qrScanner = new QrScanner(
  videoElement,
  result => handleScan(result),
  {
    preferredCamera: 'environment',
    highlightScanRegion: true,
    highlightCodeOutline: true,
    maxScansPerSecond: 25,
    calculateScanRegion: (video) => {
      // Optimize scan region for performance
      return {
        x: video.videoWidth * 0.25,
        y: video.videoHeight * 0.25,
        width: video.videoWidth * 0.5,
        height: video.videoHeight * 0.5,
        downScaleFactor: 2
      };
    }
  }
);
```

### Performance Optimization
- **Scan Rate**: 25 FPS maximum
- **Region Restriction**: Center 50% of camera view
- **Downscaling**: 2x for better performance

## Troubleshooting Guide

### Common Issues
1. **Poor Scan Performance**
   - Increase QR code size
   - Check lighting conditions
   - Clean camera lens
   
2. **Print Quality Issues**
   - Verify printer DPI settings
   - Check label material compatibility
   - Ensure proper contrast

3. **Damaged QR Codes**
   - Level Q error correction handles 25% damage
   - For critical applications, consider Level H (30%)
   - Implement redundant labeling system