'use server';

import { generateBadgeSheet, type BadgeItem } from '~/lib/badge-generator';
import type { BadgeConfig } from '~/lib/badge-config-schema';
import { logger } from '~/lib/logger';

export interface GenerateBadgePDFResult {
  success: boolean;
  data?: {
    pdfBase64: string;
    totalBadges: number;
  };
  error?: string;
}

/**
 * Server action to generate badge PDF
 *
 * Takes badge items and configuration, generates PDF using the badge-generator module
 *
 * @param items Array of badge items with short codes and URLs
 * @param config Badge configuration from user preferences
 * @returns Base64-encoded PDF or error
 */
export async function generateBadgePDFAction(
  items: BadgeItem[],
  config: BadgeConfig
): Promise<GenerateBadgePDFResult> {
  try {
    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'No items provided for badge generation',
      };
    }

    const result = await generateBadgeSheet(items, config);

    // Convert buffer to base64 for transfer to client
    const pdfBase64 = result.pdfBuffer.toString('base64');

    return {
      success: true,
      data: {
        pdfBase64,
        totalBadges: result.totalBadges,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Badge generation error:');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating badge PDF',
    };
  }
}
