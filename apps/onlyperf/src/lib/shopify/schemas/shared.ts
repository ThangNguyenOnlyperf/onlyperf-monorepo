import { z } from "zod";

/**
 * Shared schemas that can be reused across different domains
 */

export const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().nullable().optional(),
});

export const requiredAltImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
});

export const ctaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  variant: z.enum(["default", "outline"]).optional(),
});

export const productRailItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  price: z.string().min(1),
  image: imageSchema,
  href: z.string().min(1),
  tag: z.string().optional(),
});

export const categoryCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  href: z.string().min(1),
  image: requiredAltImageSchema,
});

export const bannerItemSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  alt: z.string(),
  href: z.string().min(1),
});

export const galleryItemSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  alt: z.string().optional(),
});

// Export inferred types for use in components
export type Image = z.infer<typeof imageSchema>;
export type Cta = z.infer<typeof ctaSchema>;
export type ProductRailItem = z.infer<typeof productRailItemSchema>;
export type CategoryCard = z.infer<typeof categoryCardSchema>;
export type BannerItem = z.infer<typeof bannerItemSchema>;
export type GalleryItem = z.infer<typeof galleryItemSchema>;
