import type {
  StorefrontProduct,
  StorefrontProductDetail,
  StorefrontProductImage,
  StorefrontProductVariant,
} from "../types";

export interface ProductVariantNode {
  id: string;
  title: string;
  availableForSale: boolean;
  price: StorefrontProductVariant["price"];
  image: StorefrontProductImage | null;
  selectedOptions: StorefrontProductVariant["selectedOptions"];
  colorHex: {
    value: string;
  } | null;
  variantImages: {
    references: {
      nodes: Array<{
        image: StorefrontProductImage;
      }>;
    };
  } | null;
}

export interface ProductVariantEdge {
  node: ProductVariantNode;
}

export interface ProductVariantsConnection {
  edges: ProductVariantEdge[];
}

export interface ProductOptionNode {
  id: string;
  name: string;
  values: string[];
}

export interface ProductImagesConnection {
  nodes: StorefrontProductImage[];
}

export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml?: string;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[];
  featuredImage: StorefrontProductImage | null;
  images?: ProductImagesConnection;
  options?: ProductOptionNode[];
  variants: ProductVariantsConnection;
}

export interface ProductEdge {
  node: ProductNode;
}

export interface ProductConnection {
  edges: ProductEdge[];
}

export function toStorefrontProduct(
  node: ProductNode,
): StorefrontProduct | null {
  const variants = node.variants.edges
    .map(({ node: variantNode }) => ({
      id: variantNode.id,
      title: variantNode.title,
      availableForSale: variantNode.availableForSale,
      price: variantNode.price,
      image: variantNode.image,
      selectedOptions: variantNode.selectedOptions,
      colorHex: variantNode.colorHex?.value ?? null,
      images:
        variantNode.variantImages?.references?.nodes?.map(
          (node) => node.image,
        ) ?? [],
    }))
    .filter((variant) => Boolean(variant));

  const primaryVariant = variants[0];

  if (!primaryVariant) {
    return null;
  }

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    description: node.description,
    featuredImage: node.featuredImage,
    variants,
    variant: primaryVariant,
  } satisfies StorefrontProduct;
}

export function toStorefrontProductDetail(
  node: ProductNode,
): StorefrontProductDetail | null {
  const baseProduct = toStorefrontProduct(node);
  if (!baseProduct) {
    return null;
  }

  const imagesMap = new Map<string, StorefrontProductImage>();

  if (baseProduct.featuredImage) {
    imagesMap.set(baseProduct.featuredImage.url, baseProduct.featuredImage);
  }

  for (const image of node.images?.nodes ?? []) {
    if (!imagesMap.has(image.url)) {
      imagesMap.set(image.url, image);
    }
  }

  const descriptionHtml = node.descriptionHtml?.trim()?.length
    ? node.descriptionHtml
    : baseProduct.description;

  return {
    ...baseProduct,
    descriptionHtml,
    vendor: node.vendor ?? null,
    productType: node.productType ?? null,
    tags: node.tags ?? [],
    options: (node.options ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values,
    })),
    images: Array.from(imagesMap.values()),
  } satisfies StorefrontProductDetail;
}

export function mapProductConnection(
  connection: ProductConnection,
): StorefrontProduct[] {
  return connection.edges
    .map((edge) => toStorefrontProduct(edge.node))
    .filter((product): product is StorefrontProduct => Boolean(product));
}
