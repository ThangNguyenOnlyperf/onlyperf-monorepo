import { z } from "zod";

/**
 * Template Configuration Schema
 * Defines the structure for PDF template metadata JSON files
 */

export const SlotCoordinateSchema = z.object({
  row: z.number().int().positive(),
  col: z.number().int().positive(),
  left: z.number(), // cm from left edge
  top: z.number(),  // cm from top edge (Preview measurement)
});

export const PageSizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.literal("cm"),
});

export const GridSchema = z.object({
  rows: z.number().int().positive(),
  cols: z.number().int().positive(),
  totalSlots: z.number().int().positive(),
});

export const SpacingSchema = z.object({
  rowOffset: z.number(), // cm spacing between rows
  colOffset: z.number(), // cm spacing between columns
  description: z.string().optional(),
});

export const BaseCoordinatesSchema = z.object({
  row1: z.object({
    left: z.number(),
    top: z.number(),
    description: z.string().optional(),
  }),
  row2: z.object({
    left: z.number(),
    top: z.number(),
    description: z.string().optional(),
  }),
});

export const DimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.literal("cm"),
  description: z.string().optional(),
});

export const TemplateConfigSchema = z.object({
  templateName: z.string(),
  templateFile: z.string(),
  templateImage: z.string().optional(), // PNG image for Sharp-based generation
  pageSize: PageSizeSchema,
  pageRotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(), // Rotation applied when coordinates were measured
  grid: GridSchema,
  spacing: SpacingSchema,
  baseCoordinates: BaseCoordinatesSchema,
  slotDimensions: DimensionsSchema,
  qrCodeSize: DimensionsSchema,
  coordinates: z.array(SlotCoordinateSchema),
  notes: z.record(z.string()).optional(),
});

// Inferred TypeScript types
export type SlotCoordinate = z.infer<typeof SlotCoordinateSchema>;
export type PageSize = z.infer<typeof PageSizeSchema>;
export type Grid = z.infer<typeof GridSchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type BaseCoordinates = z.infer<typeof BaseCoordinatesSchema>;
export type Dimensions = z.infer<typeof DimensionsSchema>;
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

/**
 * Coordinate conversion utilities
 */

const CM_TO_POINTS = 28.35; // 1 cm = 28.35 PDF points

/**
 * Convert centimeters to PDF points
 */
export function cmToPoints(cm: number): number {
  return cm * CM_TO_POINTS;
}

/**
 * Convert PDF points to centimeters
 */
export function pointsToCm(points: number): number {
  return points / CM_TO_POINTS;
}

/**
 * Convert Preview coordinates (top-left origin) to PDF coordinates (bottom-left origin)
 * @param topCm - Y coordinate from top edge (Preview measurement)
 * @param pageHeightCm - Total page height in cm
 * @returns Y coordinate from bottom edge (PDF coordinate)
 */
export function previewToPDFCoordinate(topCm: number, pageHeightCm: number): number {
  return pageHeightCm - topCm;
}

/**
 * Calculate centered QR position within a slot
 */
export function calculateCenteredPosition(
  slotLeft: number,
  slotTop: number,
  slotWidth: number,
  slotHeight: number,
  qrWidth: number,
  qrHeight: number
): { left: number; top: number } {
  return {
    left: slotLeft + (slotWidth - qrWidth) / 2,
    top: slotTop + (slotHeight - qrHeight) / 2,
  };
}

/**
 * Load and validate template configuration from JSON file
 */
export async function loadTemplateConfig(
  templatePath: string
): Promise<TemplateConfig> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const fullPath = path.join(process.cwd(), "public", templatePath);
  const fileContent = await fs.readFile(fullPath, "utf-8");
  const jsonData = JSON.parse(fileContent);

  const result = TemplateConfigSchema.safeParse(jsonData);

  if (!result.success) {
    throw new Error(
      `Invalid template configuration: ${result.error.message}`
    );
  }

  return result.data;
}
