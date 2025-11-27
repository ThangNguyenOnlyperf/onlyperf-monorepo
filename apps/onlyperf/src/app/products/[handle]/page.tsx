import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { ProductRecommendations } from "@/components/products/ProductRecommendations";
import {
  generateBreadcrumbSchema,
  generateProductMetadata,
  generateProductSchema,
  JsonLd,
} from "@/lib/seo";
import {
  getProductByHandle,
  getProductRecommendations,
} from "@/lib/shopify/storefront";
import { PRIMARY_LOCALE } from "@/lib/shopify/locale";

export const revalidate = 3600;

export async function generateStaticParams() {
  const { getProducts } = await import("@/lib/shopify/storefront");

  try {
    const products = await getProducts(50);

    return products.map((product) => ({
      handle: product.handle,
    }));
  } catch (error) {
    console.error("Failed to generate static params for products:", error);
    return [];
  }
}

interface ProductDetailPageProps {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle, PRIMARY_LOCALE);

  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm | OnlyPerf",
    };
  }

  return generateProductMetadata({
    product,
  });
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { handle } = await params;
  const product = await getProductByHandle(handle, PRIMARY_LOCALE);
  if (!product) {
    notFound();
  }

  const recommendations = await getProductRecommendations(
    product.id,
    8,
    PRIMARY_LOCALE,
  );

  // Structured data for SEO
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://onlyperf.com";
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Trang chủ", url: baseUrl },
    { name: "Sản phẩm", url: `${baseUrl}/collections` },
    { name: product.title, url: `${baseUrl}/collections/${product.handle}` },
  ]);

  const productSchema = generateProductSchema(product);

  return (
    <>
      <JsonLd data={[breadcrumbSchema, productSchema]} />
      <main className="container-max px-6 py-12">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
        >
          ← Quay lại sản phẩm
        </Link>
        <article className="mt-8">
          <ProductDetailClient product={product} />
        </article>
        <ProductRecommendations recommendations={recommendations} />
      </main>
    </>
  );
}
