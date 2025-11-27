import { z } from "zod";
import {
  bannerItemSchema,
  categoryCardSchema,
  ctaSchema,
  galleryItemSchema,
  imageSchema,
  productRailItemSchema,
} from "./shared";

/**
 * Homepage-specific Zod schemas for validating Shopify metaobject data.
 *
 * These schemas ensure type safety and runtime validation for all homepage
 * components that receive data from Shopify's metaobject API.
 */

/**
 * Schema for a hero carousel slide.
 *
 * Each slide includes an image, title, optional eyebrow text,
 * description, and call-to-action buttons.
 */
export const heroSlideSchema = z.object({
  id: z.string().min(1),
  image: imageSchema,
  eyebrow: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  ctas: z.array(ctaSchema).optional(),
});

/**
 * Schema for a product rail tab.
 *
 * Each tab represents a collection of products (e.g., "New Arrivals", "Best Sellers")
 * with a label, items array, and a link to view all products.
 */
export const productRailTabSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  items: z.array(productRailItemSchema).min(1),
  seeAllHref: z.string().min(1),
});

/**
 * Schema for all editable homepage content from Shopify metaobjects.
 *
 * This is the main schema that validates the complete homepage data structure,
 * including hero carousel, product rails, category cards, discovery banners,
 * and community gallery items. All fields are optional to support partial content.
 */
export const editableHomeContentSchema = z.object({
  heroSlides: z.array(heroSlideSchema).optional(),
  productRailTabs: z.array(productRailTabSchema).optional(),
  categories: z.array(categoryCardSchema).optional(),
  discoveryBanners: z.array(bannerItemSchema).optional(),
  communityItems: z.array(galleryItemSchema).optional(),
});

// Export inferred types for use in components
export type HeroCarouselSlide = z.infer<typeof heroSlideSchema>;
export type ProductRailTab = z.infer<typeof productRailTabSchema>;
export type EditableHomeContent = z.infer<typeof editableHomeContentSchema>;
