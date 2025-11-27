"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  getProductPreviewData,
  type ProductPreviewData,
} from "@/app/actions/products";
import { ProductDetailDisplay } from "@/components/product/ProductDetailDisplay";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import type { StorefrontProductVariant } from "@/lib/shopify/storefront";

interface ProductPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  productHandle: string;
  initialVariant?: StorefrontProductVariant;
}

function ProductPreviewContent({
  productHandle,
  initialVariant,
}: {
  productHandle: string;
  initialVariant?: StorefrontProductVariant;
}) {
  const [product, setProduct] = useState<ProductPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const productData = await getProductPreviewData(productHandle);

        if (isMounted) {
          if (productData) {
            setProduct(productData);
          } else {
            setError("Product not found");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching product:", err);
          setError("Failed to load product");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [productHandle]);

  if (isLoading) {
    return <ProductPreviewSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-red-500 mb-4">{error || "Product not found"}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <ProductDetailDisplay product={product} initialVariant={initialVariant} />
  );
}

function ProductPreviewSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-1/2">
        <Skeleton className="w-full h-64 lg:h-full" />
      </div>
      <div className="lg:w-1/2 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export function ProductPreview({
  isOpen,
  onClose,
  productHandle,
  initialVariant,
}: ProductPreviewProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-[66.67vw] h-full max-w-none rounded-none p-6 sm:max-w-none lg:max-w-none"
      >
        <div className="flex-1 overflow-hidden h-full">
          <ErrorBoundary
            fallback={
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-red-500 mb-4">
                  Không thể tải thông tin sản phẩm
                </p>
                <Button onClick={onClose} variant="outline">
                  Đóng
                </Button>
              </div>
            }
            onError={(error) => {
              console.error("Error in ProductPreview:", error);
            }}
          >
            <Suspense fallback={<ProductPreviewSkeleton />}>
              <ProductPreviewContent
                productHandle={productHandle}
                initialVariant={initialVariant}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
}

class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onError: (error: Error) => void;
  },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback: React.ReactNode;
    onError: (error: Error) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
