import { z } from 'zod';

/**
 * Tem nhãn (Badge/Label) template metadata
 */
export interface BadgeTemplate {
  id: string;
  name: string;
  path: string;
  qrBox: {
    x: number; // Top-left X coordinate within the original template, in pixels
    y: number; // Top-left Y coordinate within the original template, in pixels
    size: number; // Width/height of the QR square, in pixels
  };
  preview?: string; // Optional preview image path
}

/**
 * Available badge/label templates (hardcoded for maintainability)
 */
export const BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: 'bt-sport',
    name: 'Tem BT Sport',
    path: '/onlyperf/print/badge/BT-Sport-badge.png',
    qrBox: {
      x: 120,
      y: 44,
      size: 160,
    },
  },
  // Add more templates here as needed
];

/**
 * Badge/label configuration schema for validation
 */
export const BadgeConfigSchema = z.object({
  mode: z.enum(['qr-only', 'badge']).default('qr-only'),
  templateId: z.string().nullable().optional(),
  pageWidth: z.number().min(10).max(100).default(32), // cm
  pageHeight: z.number().min(10).max(150).default(48), // cm
  margin: z.number().min(0).max(200).default(60), // pixels
  gapX: z.number().min(0).max(100).default(20), // pixels
  gapY: z.number().min(0).max(100).default(20), // pixels
  dpi: z.number().min(72).max(600).default(300),
  badgeTargetWidth: z.number().min(100).max(1000).default(360), // pixels
});

export type BadgeConfig = z.infer<typeof BadgeConfigSchema>;

/**
 * Default badge configuration
 */
export const DEFAULT_BADGE_CONFIG: BadgeConfig = {
  mode: 'qr-only',
  templateId: null,
  pageWidth: 32,
  pageHeight: 48,
  margin: 60,
  gapX: 20,
  gapY: 20,
  dpi: 300,
  badgeTargetWidth: 360,
};

/**
 * Get badge template by ID
 */
export function getBadgeTemplate(id: string | null | undefined): BadgeTemplate | null {
  if (!id) return null;
  return BADGE_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * LocalStorage key for badge/label configuration
 */
export const BADGE_CONFIG_STORAGE_KEY = 'warehouse-badge-config';
