import { storefrontQuery } from "./client";
import type { Locale } from "./locale";
import { mapProductConnection } from "./mappers/product";
import { getProductImage, toRailItem } from "./product-transforms";
import { HOME_METAOBJECT_QUERY } from "./queries/home-metaobject";
import type {
  EditableHomeContent,
  HeroCarouselSlide,
  ProductRailTab,
} from "./schemas/home";
import { editableHomeContentSchema } from "./schemas/home";
import { excerpt } from "../formatters";
import { unstable_cache } from "next/cache";
import type { BannerItem, GalleryItem } from "./schemas/shared";

type ImageLike = { url?: string; altText?: string | null } | null | undefined;

function toImageSrc(image: ImageLike): { src: string; alt: string } | null {
  if (!image || !("url" in image) || !image.url) return null;
  return { src: image.url, alt: image.altText ?? "" };
}

interface CollectionNode {
  id: string;
  title: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
  products: import("./mappers/product").ProductConnection;
}

interface MetaobjectFieldReference<T> {
  reference: T | null;
}

interface MetaobjectFieldReferences<T> {
  references: { nodes: T[] } | null;
}

type MediaImageNode = {
  __typename: "MediaImage";
  id: string;
  image: { url: string; altText: string | null };
  alt: string | null;
};

type GenericFileNode = {
  __typename: "GenericFile";
  id: string;
  url: string;
  previewImage: { url: string; altText: string | null } | null;
};

type MediaNode = MediaImageNode | GenericFileNode;

interface HomeMetaobjectQueryResult {
  metaobject: {
    id: string;
    type: string;
    handle: string;
    hero: MetaobjectFieldReference<CollectionNode> | null;
    productRail: MetaobjectFieldReferences<CollectionNode> | null;
    productRailLegacy: MetaobjectFieldReferences<CollectionNode> | null;
    categories: MetaobjectFieldReferences<CollectionNode> | null;
    discovery: MetaobjectFieldReferences<MediaNode> | null;
    community: MetaobjectFieldReferences<MediaNode> | null;
    communityLegacy: MetaobjectFieldReferences<MediaNode> | null;
  } | null;
}

/**
 * Fetches CRITICAL homepage content (hero section)
 * This is the above-the-fold content that users see first
 */
async function fetchHeroContent(
  locale?: Locale,
): Promise<Pick<EditableHomeContent, "heroSlides"> | null> {
  const type = process.env.SHOPIFY_HOME_METAOBJECT_TYPE || "home_page";
  const handle = process.env.SHOPIFY_HOME_METAOBJECT_HANDLE || "home-page";

  const data = await storefrontQuery<HomeMetaobjectQueryResult>(
    HOME_METAOBJECT_QUERY,
    {
      variables: {
        type,
        handle,
        heroProductsLimit: 3,
        railProductsLimit: 0, // Skip product rails in hero query
      },
      locale,
    },
  );

  if (!data.metaobject) {
    return null;
  }

  const heroCollection = data.metaobject.hero?.reference ?? null;
  if (!heroCollection) {
    return null;
  }

  const products = mapProductConnection(heroCollection.products);
  const slides: HeroCarouselSlide[] = products
    .slice(0, 3)
    .map((product, index) => {
      const img = getProductImage(product);
      return {
        id: `hero-${product.id}`,
        image: { src: img.src, alt: img.alt },
        eyebrow: index === 0 ? heroCollection.title : undefined,
        title: product.title,
        description: excerpt(product.description, 200),
        ctas: [
          {
            href: `/products/${product.handle}`,
            label: "Xem Chi Tiết",
          },
        ],
      };
    });

  return slides.length ? { heroSlides: slides } : null;
}

/**
 * Fetches IMPORTANT homepage content (product rails + categories)
 * This is the primary content below the fold
 */
async function fetchRailsAndCategories(
  locale?: Locale,
): Promise<Pick<EditableHomeContent, "productRailTabs" | "categories"> | null> {
  const type = process.env.SHOPIFY_HOME_METAOBJECT_TYPE || "home_page";
  const handle = process.env.SHOPIFY_HOME_METAOBJECT_HANDLE || "home-page";

  const data = await storefrontQuery<HomeMetaobjectQueryResult>(
    HOME_METAOBJECT_QUERY,
    {
      variables: {
        type,
        handle,
        heroProductsLimit: 0, // Skip hero in this query
        railProductsLimit: 8,
      },
      locale,
    },
  );

  if (!data.metaobject) {
    return null;
  }

  const result: Partial<
    Pick<EditableHomeContent, "productRailTabs" | "categories">
  > = {};

  // PRODUCT RAIL TABS
  const railField =
    data.metaobject.productRail ?? data.metaobject.productRailLegacy;

  const railCollections =
    railField?.references?.nodes?.filter((n): n is CollectionNode =>
      Boolean((n as any)?.products),
    ) ?? [];

  if (railCollections.length) {
    const tabs: ProductRailTab[] = railCollections.map((col) => {
      const items = mapProductConnection(col.products).map((p) =>
        toRailItem(p, undefined, col.title),
      );
      return {
        id: col.id,
        label: col.title,
        // TODO: display collections
        seeAllHref: `/collections`,
        items,
      };
    });

    if (tabs.length) {
      result.productRailTabs = tabs;
    }
  }

  // CATEGORIES
  const categoryCollections =
    data.metaobject.categories?.references?.nodes?.filter(
      (n): n is CollectionNode => Boolean((n as any)?.handle),
    ) ?? [];

  if (categoryCollections.length) {
    result.categories = categoryCollections
      .map((col) => {
        const img = toImageSrc(col.image);
        if (!img) return null;
        return {
          id: col.id,
          title: col.title,
          href: `/collections/${col.handle}`,
          image: { src: img.src, alt: img.alt || col.title },
        };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }

  return Object.keys(result).length ? (result as any) : null;
}

/**
 * Fetches NICE-TO-HAVE homepage content (discovery banners + community gallery)
 * This is the supplementary content at the bottom
 */
async function fetchDiscoveryAndCommunity(
  locale?: Locale,
): Promise<Pick<
  EditableHomeContent,
  "discoveryBanners" | "communityItems"
> | null> {
  const type = process.env.SHOPIFY_HOME_METAOBJECT_TYPE || "home_page";
  const handle = process.env.SHOPIFY_HOME_METAOBJECT_HANDLE || "home-page";

  const data = await storefrontQuery<HomeMetaobjectQueryResult>(
    HOME_METAOBJECT_QUERY,
    {
      variables: {
        type,
        handle,
        heroProductsLimit: 0, // Skip hero
        railProductsLimit: 0, // Skip rails
      },
      locale,
    },
  );

  if (!data.metaobject) {
    return null;
  }

  const result: Partial<
    Pick<EditableHomeContent, "discoveryBanners" | "communityItems">
  > = {};

  // DISCOVERY
  const discoveryRefs = data.metaobject.discovery?.references?.nodes ?? [];
  if (discoveryRefs.length) {
    const banners: BannerItem[] = discoveryRefs
      .map((node): BannerItem | null => {
        if (node.__typename === "MediaImage" && node.image?.url) {
          return {
            id: node.id,
            src: node.image.url,
            alt: node.image.altText ?? node.alt ?? "",
            href: "/collections",
          } satisfies BannerItem;
        }
        if (node.__typename === "GenericFile") {
          const src = node.previewImage?.url || node.url;
          if (!src) return null;
          const alt = node.previewImage?.altText ?? "";
          return {
            id: node.id,
            src,
            alt,
            href: "/collections",
          } satisfies BannerItem;
        }
        return null;
      })
      .filter((item): item is BannerItem => item !== null);

    if (banners.length) {
      result.discoveryBanners = banners;
    }
  }

  // COMMUNITY
  const communityField =
    data.metaobject.community ?? data.metaobject.communityLegacy;
  const communityRefs = communityField?.references?.nodes ?? [];
  if (communityRefs.length) {
    const items: GalleryItem[] = communityRefs
      .map((node): GalleryItem | null => {
        if (node.__typename === "MediaImage" && node.image?.url) {
          return {
            id: node.id,
            src: node.image.url,
            alt: node.image.altText ?? node.alt ?? undefined,
          } satisfies GalleryItem;
        }
        if (node.__typename === "GenericFile") {
          const src = node.previewImage?.url || node.url;
          if (!src) return null;
          return {
            id: node.id,
            src,
            alt: node.previewImage?.altText ?? undefined,
          } satisfies GalleryItem;
        }
        return null;
      })
      .filter((item): item is GalleryItem => item !== null);

    if (items.length) {
      result.communityItems = items;
    }
  }

  return Object.keys(result).length ? (result as any) : null;
}

/**
 * Cached hero content with 1 week revalidation
 * Tagged for on-demand revalidation
 */
export const getCachedHeroContent = unstable_cache(
  fetchHeroContent,
  ["homepage-hero"],
  {
    revalidate: 604800, // 1 week (7 days)
    tags: ["homepage", "homepage-hero"],
  },
);

/**
 * Cached rails and categories with 1 week revalidation
 * Tagged for on-demand revalidation
 */
export const getCachedRailsAndCategories = unstable_cache(
  fetchRailsAndCategories,
  ["homepage-rails-categories"],
  {
    revalidate: 604800, // 1 week (7 days)
    tags: ["homepage", "homepage-rails"],
  },
);

/**
 * Cached discovery and community with 1 week revalidation
 * Tagged for on-demand revalidation
 */
export const getCachedDiscoveryAndCommunity = unstable_cache(
  fetchDiscoveryAndCommunity,
  ["homepage-discovery-community"],
  {
    revalidate: 604800, // 1 week (7 days)
    tags: ["homepage", "homepage-discovery"],
  },
);

/**
 * Fetches homepage content from Shopify metaobjects and transforms it into
 * a structured format for the homepage components.
 *
 * @deprecated Use getCachedHeroContent, getCachedRailsAndCategories, getCachedDiscoveryAndCommunity for better performance
 *
 * @param locale - Optional locale configuration for localized content
 * @returns Homepage content including hero slides, product rails, categories,
 *          discovery banners, and community items. Returns null if no metaobject found.
 * @throws {ZodError} If the fetched data doesn't match the expected schema
 *
 * @example
 * ```typescript
 * const content = await getEditableHomeContent(locale);
 * if (content) {
 *   // Use content.heroSlides, content.productRailTabs, etc.
 * }
 * ```
 *
 * @remarks
 * This function queries the Shopify metaobject defined by the environment variables:
 * - `SHOPIFY_HOME_METAOBJECT_TYPE` (default: "home_page")
 * - `SHOPIFY_HOME_METAOBJECT_HANDLE` (default: "home-page")
 *
 * The function supports legacy field names (`productRailLegacy`, `communityLegacy`)
 * for backward compatibility during migrations.
 */
export async function getEditableHomeContent(
  locale?: Locale,
): Promise<EditableHomeContent | null> {
  const type = process.env.SHOPIFY_HOME_METAOBJECT_TYPE || "home_page";
  const handle = process.env.SHOPIFY_HOME_METAOBJECT_HANDLE || "home-page";

  const data = await storefrontQuery<HomeMetaobjectQueryResult>(
    HOME_METAOBJECT_QUERY,
    {
      variables: {
        type,
        handle,
        heroProductsLimit: 3,
        railProductsLimit: 8,
      },
      locale,
    },
  );

  if (!data.metaobject) {
    return null;
  }

  const result: Partial<EditableHomeContent> = {};

  // HERO: build slides from the hero collection's products if present
  const heroCollection = data.metaobject.hero?.reference ?? null;
  if (heroCollection) {
    const products = mapProductConnection(heroCollection.products);
    const slides: HeroCarouselSlide[] = products
      .slice(0, 3)
      .map((product, index) => {
        const img = getProductImage(product);
        return {
          id: `hero-${product.id}`,
          image: { src: img.src, alt: img.alt },
          eyebrow: index === 0 ? heroCollection.title : undefined,
          title: product.title,
          description: excerpt(product.description, 200),
          ctas: [
            {
              href: `/products/${product.handle}`,
              label: "View product",
            },
          ],
        };
      });

    if (slides.length) {
      result.heroSlides = slides;
    }
  }

  // PRODUCT RAIL TABS: map each referenced collection to a tab
  const railField =
    data.metaobject.productRail ?? data.metaobject.productRailLegacy;

  const railCollections =
    railField?.references?.nodes?.filter((n): n is CollectionNode =>
      Boolean((n as any)?.products),
    ) ?? [];

  if (railCollections.length) {
    const tabs: ProductRailTab[] = railCollections.map((col) => {
      const items = mapProductConnection(col.products).map((p) =>
        toRailItem(p, undefined, col.title),
      );
      return {
        id: col.id,
        label: col.title,
        seeAllHref: `/collections/${col.handle}`,
        items,
      };
    });

    if (tabs.length) {
      result.productRailTabs = tabs;
    }
  }

  // CATEGORIES: collections for cards
  const categoryCollections =
    data.metaobject.categories?.references?.nodes?.filter(
      (n): n is CollectionNode => Boolean((n as any)?.handle),
    ) ?? [];

  if (categoryCollections.length) {
    result.categories = categoryCollections
      .map((col) => {
        const img = toImageSrc(col.image);
        if (!img) return null;
        return {
          id: col.id,
          title: col.title,
          href: `/collections/${col.handle}`,
          image: { src: img.src, alt: img.alt || col.title },
        };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }

  // DISCOVERY: image banners
  const discoveryRefs = data.metaobject.discovery?.references?.nodes ?? [];
  if (discoveryRefs.length) {
    const banners: BannerItem[] = discoveryRefs
      .map((node): BannerItem | null => {
        if (node.__typename === "MediaImage" && node.image?.url) {
          return {
            id: node.id,
            src: node.image.url,
            alt: node.image.altText ?? node.alt ?? "",
            href: "/collections",
          } satisfies BannerItem;
        }
        if (node.__typename === "GenericFile") {
          const src = node.previewImage?.url || node.url;
          if (!src) return null;
          const alt = node.previewImage?.altText ?? "";
          return {
            id: node.id,
            src,
            alt,
            href: "/collections",
          } satisfies BannerItem;
        }
        return null;
      })
      .filter((item): item is BannerItem => item !== null);

    if (banners.length) {
      result.discoveryBanners = banners;
    }
  }

  // COMMUNITY: gallery images
  const communityField =
    data.metaobject.community ?? data.metaobject.communityLegacy;
  const communityRefs = communityField?.references?.nodes ?? [];
  if (communityRefs.length) {
    const items: GalleryItem[] = communityRefs
      .map((node): GalleryItem | null => {
        if (node.__typename === "MediaImage" && node.image?.url) {
          return {
            id: node.id,
            src: node.image.url,
            alt: node.image.altText ?? node.alt ?? undefined,
          } satisfies GalleryItem;
        }
        if (node.__typename === "GenericFile") {
          const src = node.previewImage?.url || node.url;
          if (!src) return null;
          return {
            id: node.id,
            src,
            alt: node.previewImage?.altText ?? undefined,
          } satisfies GalleryItem;
        }
        return null;
      })
      .filter((item): item is GalleryItem => item !== null);

    if (items.length) {
      result.communityItems = items;
    }
  }

  if (!Object.keys(result).length) {
    return null;
  }

  return editableHomeContentSchema.parse(result);
}
