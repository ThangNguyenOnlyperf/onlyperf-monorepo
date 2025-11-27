/**
 * Table of Contents utilities for blog articles
 * Processes HTML content to extract headings and add IDs for anchor navigation
 */

import { load } from "cheerio";
import type {
  ArticleHeading,
  ProcessedArticleContent,
} from "@/lib/shopify/types";

/**
 * Generate a URL-safe ID from heading text
 */
function generateHeadingId(text: string, index: number): string {
  const baseId = text
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^\w\s-]/g, "")
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Remove multiple consecutive hyphens
    .replace(/-+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, "");

  // Fallback to index-based ID if text is empty after sanitization
  return baseId || `heading-${index}`;
}

/**
 * Process article HTML content to:
 * 1. Extract headings (h2, h3, h4) for Table of Contents
 * 2. Add IDs to headings for anchor navigation
 * 3. Return processed HTML and headings array
 */
export function processArticleContent(html: string): ProcessedArticleContent {
  const $ = load(html);
  const headings: ArticleHeading[] = [];

  // Select all heading elements (h2, h3, h4)
  $("h2, h3, h4").each((index, element) => {
    const $el = $(element);
    const text = $el.text().trim();
    const tagName = element.tagName.toLowerCase();
    const level = Number.parseInt(tagName[1], 10); // Extract number from h2, h3, h4

    // Generate unique ID
    const id = generateHeadingId(text, index);

    // Add ID attribute to the heading element
    $el.attr("id", id);

    // Add scroll-margin-top to account for sticky header/navbar
    // This prevents headings from being hidden behind fixed elements when scrolling to anchor
    $el.attr("style", "scroll-margin-top: 6rem");

    // Add to headings array
    headings.push({
      id,
      text,
      level,
    });
  });

  return {
    processedHtml: $.html(),
    headings,
  };
}
