"use client";

import { useMemo, useState } from "react";
import { ProductAddToCartButton } from "@/components/product/ProductAddToCartButton";
import { ProductDetailsSection } from "@/components/product/ProductDetailsSection";
import { ProductMeta } from "@/components/product/ProductMeta";
import { ProductVariantImages } from "@/components/product/ProductVariantImages";
import {
  ColorSelector,
  SizeSelector,
} from "@/components/product/ProductVariantSelector";
import { useAddToCart } from "@/hooks/useAddToCart";
import { useProductVariantSelection } from "@/hooks/useProductVariantSelection";
import { useToggle } from "@/hooks/useToggle";
import type { StorefrontProductDetail } from "../lib/shopify/storefront";

interface ProductDetailClientProps {
  product: StorefrontProductDetail;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [quantity, setQuantity] = useState(1);
  const [isDetailsOpen, toggleDetails] = useToggle(true);

  const {
    sizeOptions,
    colorOptions,
    selectedVariant,
    selectedSize,
    selectedColorToken,
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
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="lg:sticky lg:top-16 lg:h-fit lg:self-start pt-4 lg:flex lg:flex-col md:gap-6 ">
        <div className="block lg:hidden">
          <ProductMeta
            title={product.title}
            price={selectedVariant.price}
            availableForSale={selectedVariant.availableForSale}
            tags={product.tags}
          />
        </div>
        <div className="mt-6 md:mt-0 ">
          <ProductVariantImages
            image={displayImage}
            images={selectedVariant.images}
            fallbackTitle={product.title}
          />
        </div>
      </div>
      <div className="sticky flex flex-col pt-4 gap-8 top-16 h-fit self-start ">
        <div className="hidden lg:block">
          <ProductMeta
            title={product.title}
            price={selectedVariant.price}
            availableForSale={selectedVariant.availableForSale}
            tags={product.tags}
          />
        </div>
        <SizeSelector
          sizes={sizeOptions}
          selectedSize={selectedSize}
          onSelect={setSelectedSize}
        />

        <ColorSelector
          colors={colorOptions}
          selectedColorToken={selectedColorToken}
          onSelect={setSelectedColorToken}
        />

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

        <ProductDetailsSection
          isOpen={isDetailsOpen}
          onToggle={toggleDetails}
          descriptionHtml={product.descriptionHtml}
          description={product.description}
        />
      </div>
    </div>
  );
}
