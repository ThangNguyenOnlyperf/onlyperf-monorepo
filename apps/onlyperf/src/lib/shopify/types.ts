export interface StorefrontProductVariantPrice {
  amount: string;
  currencyCode: string;
}

export interface StorefrontProductVariantSelectedOption {
  name: string;
  value: string;
}

export interface StorefrontProductImage {
  url: string;
  altText: string | null;
}

export interface StorefrontProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: StorefrontProductVariantPrice;
  image: StorefrontProductImage | null;
  selectedOptions: StorefrontProductVariantSelectedOption[];
  colorHex: string | null;
  images?: StorefrontProductImage[];
}

export interface StorefrontProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  featuredImage: StorefrontProductImage | null;
  variants: StorefrontProductVariant[];
  variant: StorefrontProductVariant;
}

export interface StorefrontProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface StorefrontProductDetail extends StorefrontProduct {
  descriptionHtml: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  options: StorefrontProductOption[];
  images: StorefrontProductImage[];
}

export interface HomepageProductHighlights {
  featured: StorefrontProduct | null;
  newArrivals: StorefrontProduct[];
  bestSellers: StorefrontProduct[];
  featuredSource: "collection" | "created_at";
  bestSellersSource: "collection" | "best_selling";
  featuredCollectionTitle: string | null;
  bestSellersCollectionTitle: string | null;
}

export interface HomepageProductHighlightsOptions {
  featuredCollectionHandle?: string;
  bestSellingCollectionHandle?: string;
  newArrivalLimit?: number;
  bestSellingLimit?: number;
}

export interface ProductFilterOption {
  token: string;
  label: string;
  count: number;
  isActive: boolean;
  swatchColor?: string | null;
}

export interface ProductListingFilters {
  colors: ProductFilterOption[];
  sizes: ProductFilterOption[];
}

export interface ProductListingOptions {
  page?: number;
  pageSize?: number;
  colorFilters?: string[];
  sizeFilters?: string[];
  maxProducts?: number;
  locale?: import("./locale").Locale;
}

export interface ProductListingResult {
  items: StorefrontProduct[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters: ProductListingFilters;
}

export interface StorefrontCollectionSummary {
  id: string;
  title: string;
  handle: string;
  image: StorefrontProductImage | null;
  type: string | null;
}

export interface ProductVariantListingItem {
  product: StorefrontProduct;
  variant: StorefrontProductVariant;
}

export interface StorefrontBlog {
  id: string;
  handle: string;
  title: string;
}

export interface StorefrontArticleImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface StorefrontArticleSEO {
  title: string | null;
  description: string | null;
}

export interface StorefrontArticle {
  id: string;
  title: string;
  handle: string;
  excerpt: string | null;
  excerptHtml: string | null;
  contentHtml: string;
  publishedAt: string;
  image: StorefrontArticleImage | null;
  authorName: string | null;
  blogHandle: string;
  blogTitle: string;
  tags: string[];
  seo: StorefrontArticleSEO | null;
}

export interface ArticleHeading {
  id: string;
  text: string;
  level: number;
}

export interface ProcessedArticleContent {
  processedHtml: string;
  headings: ArticleHeading[];
}
