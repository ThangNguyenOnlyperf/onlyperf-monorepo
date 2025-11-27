# PDF Font Setup Guide

This guide explains how to set up fonts for PDF generation in the warehouse management system.

## Current Setup (CDN)

The application currently uses Roboto font from unpkg CDN for Vietnamese language support in PDFs.

```typescript
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-400-normal.woff',
      fontWeight: 'normal',
    },
    {
      src: 'https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-700-normal.woff',
      fontWeight: 'bold',
    },
  ],
});
```

## Local Font Setup

### Option 1: Using Public Directory

1. **Download fonts**:
   ```bash
   # Create fonts directory
   mkdir -p public/fonts

   # Download Roboto Vietnamese fonts
   curl -o public/fonts/roboto-vietnamese-400-normal.woff \
     https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-400-normal.woff
   
   curl -o public/fonts/roboto-vietnamese-700-normal.woff \
     https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-700-normal.woff
   ```

2. **Update font registration** in `src/lib/pdf-templates-grouped.tsx`:
   ```typescript
   Font.register({
     family: 'Roboto',
     fonts: [
       {
         src: '/fonts/roboto-vietnamese-400-normal.woff',
         fontWeight: 'normal',
       },
       {
         src: '/fonts/roboto-vietnamese-700-normal.woff',
         fontWeight: 'bold',
       },
     ],
   });
   ```

### Option 2: Using Base64 Encoded Fonts

1. **Download and convert fonts to base64**:
   ```bash
   # Download font
   curl -o roboto-400.woff \
     https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-400-normal.woff
   
   # Convert to base64 (on macOS/Linux)
   base64 -i roboto-400.woff -o roboto-400-base64.txt
   ```

2. **Create a font constants file** `src/lib/fonts/roboto-base64.ts`:
   ```typescript
   export const ROBOTO_400_BASE64 = 'data:font/woff;base64,YOUR_BASE64_STRING_HERE';
   export const ROBOTO_700_BASE64 = 'data:font/woff;base64,YOUR_BASE64_STRING_HERE';
   ```

3. **Update font registration**:
   ```typescript
   import { ROBOTO_400_BASE64, ROBOTO_700_BASE64 } from '~/lib/fonts/roboto-base64';

   Font.register({
     family: 'Roboto',
     fonts: [
       {
         src: ROBOTO_400_BASE64,
         fontWeight: 'normal',
       },
       {
         src: ROBOTO_700_BASE64,
         fontWeight: 'bold',
       },
     ],
   });
   ```

### Alternative Fonts with Vietnamese Support

If Roboto doesn't work well, you can try these alternatives:

1. **Noto Sans** (Google):
   - Regular: https://fonts.gstatic.com/s/notosans/v30/o-0IIpQlx3QUlC5A4PNr5TRA.woff2
   - Bold: https://fonts.gstatic.com/s/notosans/v30/o-0NIpQlx3QUlC5A4PNjXhFVZNyB.woff2

2. **Inter** (popular modern font):
   - Available at: https://fonts.google.com/specimen/Inter

3. **Source Sans Pro**:
   - Available at: https://fonts.google.com/specimen/Source+Sans+Pro

## Troubleshooting

### Common Issues

1. **"Offset is outside the bounds of the DataView" error**:
   - This usually means the font file couldn't be loaded
   - Check CORS headers if using external URLs
   - Try using local fonts or base64 encoding

2. **Vietnamese characters showing as boxes**:
   - Make sure you're using the Vietnamese subset of the font
   - Check that fontFamily is correctly set in all text styles

3. **Font not applying**:
   - Verify the font name matches exactly in Font.register and styles
   - Check browser console for font loading errors
   - Ensure the font URL is accessible

### Testing Fonts

Create a simple test PDF to verify font loading:

```typescript
const TestPDF = () => (
  <Document>
    <Page size="A4" style={{ fontFamily: 'Roboto', padding: 30 }}>
      <Text>English: Hello World</Text>
      <Text>Vietnamese: Xin chào thế giới</Text>
      <Text>Special chars: ă â đ ê ô ơ ư</Text>
    </Page>
  </Document>
);
```

## Performance Considerations

- Base64 encoded fonts increase bundle size but guarantee availability
- External CDN fonts reduce bundle size but depend on network
- Local public directory fonts offer a good balance

## Recommended Setup for Production

1. Use local fonts in the public directory for reliability
2. Implement fallback to default fonts if custom fonts fail
3. Consider using a font loading service like Typekit for enterprise deployments