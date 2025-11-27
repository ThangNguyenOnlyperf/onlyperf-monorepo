import { storefrontQuery } from "./client";
import type { Locale } from "./locale";
import {
  mapProductConnection,
  type ProductConnection,
} from "./mappers/product";
import {
  COLLECTION_BY_HANDLE_PRODUCTS_QUERY,
  COLLECTIONS_QUERY,
  LOCALIZATION_QUERY,
} from "./queries/collections";
import { PRODUCTS_WITH_SORT_QUERY } from "./queries/products";
import type {
  ProductVariantListingItem,
  StorefrontCollectionSummary,
  StorefrontProduct,
} from "./types";

export type CatalogSortHandle =
  | "recommended"
  | "price-asc"
  | "price-desc"
  | "newest";

interface CatalogSortDefinition {
  label: string;
  collectionSort: {
    sortKey: CollectionSortKey;
    reverse: boolean;
  };
  productSort: {
    sortKey: ProductSortKey;
    reverse: boolean;
  };
}

interface CollectionsQueryResult {
  collections: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        description: string | null;
        image: {
          url: string;
          altText: string | null;
        } | null;
        type: {
          value: string;
        } | null;
      };
    }>;
  };
}

interface CollectionByHandleProductsResult {
  collection: {
    id: string;
    title: string;
    handle: string;
    description: string | null;
    image: {
      url: string;
      altText: string | null;
    } | null;
    type: {
      value: string;
    } | null;
    products: ProductConnection;
  } | null;
}

interface ProductsWithSortResult {
  products: ProductConnection;
}

type CollectionSortKey =
  | "COLLECTION_DEFAULT"
  | "PRICE"
  | "CREATED"
  | "BEST_SELLING";

type ProductSortKey = "BEST_SELLING" | "PRICE" | "CREATED_AT";

const DEFAULT_MAX_PRODUCTS = 50;

const SORT_DEFINITIONS: Record<CatalogSortHandle, CatalogSortDefinition> = {
  recommended: {
    label: "Đề xuất",
    collectionSort: {
      sortKey: "COLLECTION_DEFAULT",
      reverse: false,
    },
    productSort: {
      sortKey: "BEST_SELLING",
      reverse: false,
    },
  },
  "price-asc": {
    label: "Giá: Thấp → Cao",
    collectionSort: {
      sortKey: "PRICE",
      reverse: false,
    },
    productSort: {
      sortKey: "PRICE",
      reverse: false,
    },
  },
  "price-desc": {
    label: "Giá: Cao → Thấp",
    collectionSort: {
      sortKey: "PRICE",
      reverse: true,
    },
    productSort: {
      sortKey: "PRICE",
      reverse: true,
    },
  },
  newest: {
    label: "Mới nhất",
    collectionSort: {
      sortKey: "CREATED",
      reverse: true,
    },
    productSort: {
      sortKey: "CREATED_AT",
      reverse: true,
    },
  },
};

export const CATALOG_SORT_OPTIONS = (
  Object.entries(SORT_DEFINITIONS) as Array<
    [CatalogSortHandle, CatalogSortDefinition]
  >
).map(([value, definition]) => ({
  value,
  label: definition.label,
}));

function mapCollectionNode(node: {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  image: {
    url: string;
    altText: string | null;
  } | null;
  type: {
    value: string;
  } | null;
}): StorefrontCollectionSummary {
  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    image: node.image
      ? {
          url: node.image.url,
          altText: node.image.altText,
        }
      : null,
    type: node.type?.value ?? null,
  };
}

export function filterCollectionsByType(
  collections: StorefrontCollectionSummary[],
  targetType: string,
): StorefrontCollectionSummary[] {
  return collections.filter((collection) => {
    if (!collection.type) return false;

    const types = collection.type.split(",").map((t) => t.trim().toLowerCase());
    return types.includes(targetType.toLowerCase());
  });
}

export async function getShopifyLocalization(locale?: Locale) {
  return await storefrontQuery(LOCALIZATION_QUERY, {
    locale,
    withInContext: false,
  });
}

export async function getCatalogCollections(
  locale?: Locale,
  buyerIp?: string,
): Promise<StorefrontCollectionSummary[]> {
  const data = await storefrontQuery<CollectionsQueryResult>(
    COLLECTIONS_QUERY,
    {
      locale,
      buyerIp,
      withInContext: true,
    },
  );
  const allCollections = data.collections.edges.map((edge) =>
    mapCollectionNode(edge.node),
  );

  return filterCollectionsByType(allCollections, "category");
}

function flattenProductVariants(
  products: StorefrontProduct[],
): ProductVariantListingItem[] {
  const listings: ProductVariantListingItem[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      listings.push({ product, variant });
    }
  }

  return listings;
}

function resolveSortDefinition(sort?: CatalogSortHandle | null) {
  return (
    SORT_DEFINITIONS[sort ?? "recommended"] ?? SORT_DEFINITIONS.recommended
  );
}

export interface CatalogListingArgs {
  categoryHandle?: string | null;
  sort?: CatalogSortHandle | null;
  productLimit?: number;
  locale?: Locale;
  buyerIp?: string;
}

export interface CatalogListingResult {
  categories: StorefrontCollectionSummary[];
  activeCollection: StorefrontCollectionSummary | null;
  products: StorefrontProduct[];
  variants: ProductVariantListingItem[];
  heading: string;
  description: string | null;
  sort: CatalogSortHandle;
}

export async function getCatalogListing(
  args: CatalogListingArgs = {},
): Promise<CatalogListingResult | null> {
  const {
    categoryHandle,
    sort,
    productLimit = DEFAULT_MAX_PRODUCTS,
    locale,
    buyerIp,
  } = args;
  const sortDefinition = resolveSortDefinition(sort);
  const categories = await getCatalogCollections(locale, buyerIp);

  if (categoryHandle) {
    const data = await storefrontQuery<CollectionByHandleProductsResult>(
      COLLECTION_BY_HANDLE_PRODUCTS_QUERY,
      {
        variables: {
          handle: categoryHandle,
          first: productLimit,
          sortKey: sortDefinition.collectionSort.sortKey,
          reverse: sortDefinition.collectionSort.reverse,
        },
        locale,
        buyerIp,
        withInContext: true,
      },
    );

    if (!data.collection) {
      return null;
    }

    const products = mapProductConnection(data.collection.products);
    const activeCollection = mapCollectionNode(data.collection);

    const isCategoryCollection =
      activeCollection.type &&
      activeCollection.type
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes("category");

    if (!isCategoryCollection) {
      return null;
    }

    const categoriesWithActive = categories.some(
      (item) => item.handle === activeCollection.handle,
    )
      ? categories
      : [...categories, activeCollection];

    return {
      categories: categoriesWithActive,
      activeCollection,
      products,
      variants: flattenProductVariants(products),
      heading: activeCollection.title,
      description: data.collection.description?.trim() || null,
      sort: sortDefinition ? (sort ?? "recommended") : "recommended",
    };
  }

  const productsData = await storefrontQuery<ProductsWithSortResult>(
    PRODUCTS_WITH_SORT_QUERY,
    {
      variables: {
        first: productLimit,
        sortKey: sortDefinition.productSort.sortKey,
        reverse: sortDefinition.productSort.reverse,
      },
      locale,
      buyerIp,
      withInContext: true,
    },
  );

  const products = mapProductConnection(productsData.products);

  return {
    categories,
    activeCollection: null,
    products,
    variants: flattenProductVariants(products),
    heading: "Tất cả sản phẩm",
    description: null,
    sort: sort ?? "recommended",
  };
}
