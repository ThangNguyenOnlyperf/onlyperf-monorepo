"use client";

import { useMemo, useState } from "react";

import type { ProductPreviewData } from "@/app/actions/products";
import { ProductAddToCartButton } from "@/components/product/ProductAddToCartButton";
import {
  ProductImage,
  ProductImageFallback,
} from "@/components/product/ProductImage";
import { ProductMeta } from "@/components/product/ProductMeta";
import { ProductQuantitySelector } from "@/components/product/ProductQuantitySelector";
import {
  ColorSelector,
  SizeSelector,
  VariantInfo,
} from "@/components/product/ProductVariantSelector";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useProductVariantSelection } from "@/hooks/useProductVariantSelection";
import type { StorefrontProductVariant } from "@/lib/shopify/storefront";

interface ProductDetailDisplayProps {
  product: ProductPreviewData;
  initialVariant?: StorefrontProductVariant;
}

function transformPreviewDataToProductFormat(
  previewData: ProductPreviewData,
  initialVariant?: StorefrontProductVariant,
) {
  const matchingVariantIndex = initialVariant
    ? previewData.variants.findIndex((v) => v.id === initialVariant.id)
    : 0;

  const matchingVariant =
    previewData.variants[matchingVariantIndex] ?? previewData.variants[0];

  const transformedVariants: StorefrontProductVariant[] =
    previewData.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      price: {
        amount: variant.price.amount,
        currencyCode: variant.price.currencyCode,
      },
      image: variant.image
        ? {
            url: variant.image.url,
            altText: variant.image.altText,
          }
        : null,
      selectedOptions: variant.selectedOptions,
      colorHex: variant.colorHex,
    }));

  return {
    id: previewData.id,
    handle: previewData.handle,
    title: previewData.title,
    description: previewData.description,
    descriptionHtml: previewData.description || "", // We don't have HTML in preview data
    featuredImage: previewData.featuredImage,
    tags: previewData.tags,
    variants: transformedVariants,
    variant: matchingVariant || transformedVariants[0],
  };
}

export function ProductDetailDisplay({
  product: previewData,
  initialVariant,
}: ProductDetailDisplayProps) {
  const [quantity, setQuantity] = useState(1);

  const product = transformPreviewDataToProductFormat(
    previewData,
    initialVariant,
  );

  const {
    sizeOptions,
    colorOptions,
    selectedVariant,
    selectedSize,
    selectedColorToken,
    selectedSizeLabel,
    selectedColorLabel,
    selectedColorHex,
    setSelectedSize,
    setSelectedColorToken,
  } = useProductVariantSelection(product.variants, product.variant);

  const { isAdding, showSuccess, addToCart } = useAddToCart();

  const totalPrice = useMemo(() => {
    const amount = parseFloat(selectedVariant.price.amount);
    return (amount * quantity).toFixed(2);
  }, [selectedVariant.price.amount, quantity]);

  const displayImage = selectedVariant.image ?? product.featuredImage ?? null;

  const handleAddToCart = () => {
    if (!selectedVariant.availableForSale) return;

    addToCart({
      merchandiseId: selectedVariant.id,
      quantity,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Image Section */}
      <div className="lg:w-1/2 flex-shrink-0 h-64 lg:h-auto">
        {displayImage ? (
          <div className="w-full h-full">
            <ProductImage
              src={displayImage.url}
              alt={displayImage.altText ?? product.title}
              priority={false}
            />
          </div>
        ) : (
          <ProductImageFallback />
        )}
      </div>

      {/* Product Details Section */}
      <div className="lg:w-1/2 flex-1 overflow-y-auto">
        <div className="space-y-4">
          <ProductMeta
            title={product.title}
            price={selectedVariant.price}
            availableForSale={selectedVariant.availableForSale}
            tags={product.tags}
          />

          <ProductQuantitySelector quantity={quantity} onChange={setQuantity} />

          {sizeOptions.length > 0 && (
            <SizeSelector
              sizes={sizeOptions}
              selectedSize={selectedSize}
              onSelect={setSelectedSize}
            />
          )}

          {colorOptions.length > 0 && (
            <ColorSelector
              colors={colorOptions}
              selectedColorToken={selectedColorToken}
              onSelect={setSelectedColorToken}
            />
          )}

          <ProductAddToCartButton
            isAdding={isAdding}
            showSuccess={showSuccess}
            availableForSale={selectedVariant.availableForSale}
            quantity={quantity}
            currencyCode={selectedVariant.price.currencyCode}
            totalPrice={totalPrice}
            productTitle={product.title}
            onClick={handleAddToCart}
          />

          <VariantInfo
            sizeLabel={selectedSizeLabel}
            colorLabel={selectedColorLabel}
            colorHex={selectedColorHex}
          />

          {/* Product Description */}
          {product.description && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">Mô tả sản phẩm</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
