import fs from 'node:fs/promises';
import path from 'node:path';
import { generateBadgeSheet } from '../src/lib/badge-generator';
import type { BadgeItem } from '../src/lib/badge-generator';
import type { BadgeConfig } from '../src/lib/badge-config-schema';

/**
 * Test script for badge/label generation
 *
 * This script demonstrates how to use the badge-generator module
 * to create label sheets with QR codes.
 *
 * Run with: pnpm tsx scripts/generate-badge-sheet.ts
 */

async function main() {
  const outputPath = 'public/onlyperf/badge-sheet-onlyperf-32x48.pdf';

  // Test configuration - Tem nhãn mode with BT Sport template
  const badgeConfig: BadgeConfig = {
    mode: 'badge', // Switch to 'qr-only' to test QR-only mode
    templateId: 'bt-sport',
    pageWidth: 32,  // cm
    pageHeight: 48, // cm
    margin: 60,
    gapX: 20,
    gapY: 20,
    dpi: 300,
    badgeTargetWidth: 360,
  };

  // Generate test items (calculate how many fit on page)
  const pageWidthPx = Math.round((badgeConfig.pageWidth / 2.54) * badgeConfig.dpi);
  const pageHeightPx = Math.round((badgeConfig.pageHeight / 2.54) * badgeConfig.dpi);
  const availableWidth = pageWidthPx - badgeConfig.margin * 2;
  const availableHeight = pageHeightPx - badgeConfig.margin * 2;

  const itemWidth = badgeConfig.badgeTargetWidth;
  const itemHeight = badgeConfig.badgeTargetWidth; // Approximate

  const columns = Math.floor((availableWidth + badgeConfig.gapX) / (itemWidth + badgeConfig.gapX));
  const rows = Math.floor((availableHeight + badgeConfig.gapY) / (itemHeight + badgeConfig.gapY));
  const totalBadges = columns * rows;

  console.log(`Generating ${totalBadges} tem nhãn (${columns} columns × ${rows} rows)...`);

  // Create test items with short codes
  const items: BadgeItem[] = Array.from({ length: totalBadges }, (_, index) => {
    const shortCode = `TEST${(index + 1).toString().padStart(4, '0')}`;
    return {
      id: `test-${index}`,
      shortCode,
      url: `https://onlyperf.com/p/${shortCode}`,
    };
  });

  console.log(`Mode: ${badgeConfig.mode}`);
  console.log(`Template: ${badgeConfig.templateId ?? 'None (QR-only)'}`);

  // Generate badge sheet
  const result = await generateBadgeSheet(items, badgeConfig);

  // Save to file
  const outputAbsolute = path.resolve(process.cwd(), outputPath);
  const dir = path.dirname(outputAbsolute);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputAbsolute, result.pdfBuffer);

  console.log(`✓ Tem nhãn sheet created with ${result.totalBadges} items`);
  console.log(`✓ Saved to: ${outputAbsolute}`);
  console.log(`\nTo test QR-only mode, change mode to 'qr-only' in the config.`);
}

main().catch((error) => {
  console.error('Failed to generate badge sheet');
  console.error(error);
  process.exitCode = 1;
});
