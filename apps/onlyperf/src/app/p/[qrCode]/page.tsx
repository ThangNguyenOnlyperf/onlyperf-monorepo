import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readCustomerSessionFromCookies } from "@/lib/shopify/customer-account";
import {
  CheckCircle,
  XCircle,
  Mail,
  FileText,
  Clock,
  Package,
  ArrowRightLeft,
} from "lucide-react";
import { getVariantById } from "@/lib/shopify/products";
import { ProductVariantImages } from "@/components/product/ProductVariantImages";
import Link from "next/link";
import {
  getShipmentItemByQrCode,
  trackCustomerScan,
} from "@/actions/productPortalActions";
import {
  isValidQrCodeFormat,
  normalizeQrCode,
  computeWarrantyInfo,
  isProductOwner,
} from "@/lib/product-portal/utils";

interface ProductPortalPageProps {
  params: Promise<{
    qrCode: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: ProductPortalPageProps): Promise<Metadata> {
  const { qrCode } = await params;
  const normalizedQrCode = normalizeQrCode(qrCode);

  const unit = await getShipmentItemByQrCode(normalizedQrCode);

  if (!unit) {
    return { title: "Sản phẩm không tìm thấy" };
  }

  // Fetch product title from Shopify using shopifyVariantId from joined product
  const shopifyVariantId = unit.product?.shopifyProduct?.shopifyVariantId;
  if (!shopifyVariantId) {
    return { title: "Xác thực sản phẩm OnlyPerf" };
  }

  const variantData = await getVariantById(shopifyVariantId);

  if (!variantData) {
    return { title: "Xác thực sản phẩm OnlyPerf" };
  }

  const productTitle = variantData.variant.product.title;

  return {
    title: `${productTitle} - Xác thực sản phẩm`,
    description: `Xác thực sản phẩm OnlyPerf chính hãng - ${productTitle}`,
  };
}

export default async function ProductPortalPage({
  params,
}: ProductPortalPageProps) {
  const { qrCode } = await params;
  const normalizedQrCode = normalizeQrCode(qrCode);

  // 1. Validate QR code format
  if (!isValidQrCodeFormat(normalizedQrCode)) {
    notFound();
  }

  // 2. Lookup shipment item (product unit) with product data
  const unit = await getShipmentItemByQrCode(normalizedQrCode);

  if (!unit) {
    notFound();
  }

  // 3. Get Shopify variant ID from joined product
  const shopifyVariantId = unit.product?.shopifyProduct?.shopifyVariantId;
  if (!shopifyVariantId) {
    console.error("No Shopify variant linked for product:", unit.productId);
    notFound();
  }

  // 4. Fetch product data from Shopify (on-demand)
  const variantData = await getVariantById(shopifyVariantId);

  if (!variantData) {
    console.error("Variant not found in Shopify:", shopifyVariantId);
    notFound();
  }

  const { variant, images: variantImages } = variantData;
  const productTitle = variant.product.title;
  const productDescription = variant.product.description;

  // Extract color and size from variant options
  const colorOption = variant.selectedOptions.find(
    (opt) => opt.name.toLowerCase() === "color" || opt.name === "Màu sắc",
  );
  const sizeOption = variant.selectedOptions.find(
    (opt) => opt.name.toLowerCase() === "size" || opt.name === "Kích thước",
  );

  // 5. Check authentication status
  const session = await readCustomerSessionFromCookies();
  const isLoggedIn = Boolean(session);

  // 6. Track customer scan event
  await trackCustomerScan(
    normalizedQrCode,
    unit.id,
    session?.customer.id ?? null,
    unit.customerScanCount,
    unit.firstScannedByCustomerAt,
  );

  // 7. Check ownership
  const isOwner = isProductOwner(
    unit.currentOwnerId,
    session?.customer.id ?? null,
  );

  // 8. Compute warranty info
  const warrantyInfo = computeWarrantyInfo(
    unit.warrantyStatus,
    unit.deliveredAt,
    unit.warrantyMonths,
  );

  // 9. Render portal
  return (
    <main className="container-max mx-auto px-4 py-8">
      {/* Product Image Gallery */}
      <div className="mb-6">
        <ProductVariantImages
          image={null}
          images={variantImages}
          fallbackTitle={productTitle}
        />
      </div>

      {/* Authentication Badge */}
      <div className="mb-6">
        {unit.isAuthentic ? (
          <div className="flex items-center gap-3 rounded-lg border-2 border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-8 w-8 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                Sản phẩm chính hãng OnlyPerf
              </p>
              <p className="text-sm text-green-700">
                Đã xác thực nguồn gốc xuất xứ
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <XCircle className="h-8 w-8 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">
                Cảnh báo: Sản phẩm không xác thực
              </p>
              <p className="text-sm text-red-700">
                Vui lòng liên hệ hỗ trợ khách hàng
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Product Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{productTitle}</h1>
        {(colorOption || sizeOption) && (
          <p className="mt-2 text-gray-600">
            {colorOption && `Màu: ${colorOption.value}`}
            {colorOption && sizeOption && " | "}
            {sizeOption && `Kích thước: ${sizeOption.value}`}
          </p>
        )}
        {productDescription && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
            {productDescription}
          </p>
        )}
      </div>

      {/* Product Specifications */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Thông tin sản phẩm
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Mã sản phẩm</dt>
            <dd className="mt-1 font-mono text-sm text-gray-900">
              {normalizedQrCode}
            </dd>
          </div>
          {colorOption && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Màu sắc</dt>
              <dd className="mt-1 text-sm text-gray-900">{colorOption.value}</dd>
            </div>
          )}
          {sizeOption && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Kích thước</dt>
              <dd className="mt-1 text-sm text-gray-900">{sizeOption.value}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-gray-500">Giá</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: variant.price.currencyCode,
              }).format(Number(variant.price.amount))}
            </dd>
          </div>
        </dl>
      </div>

      {/* Warranty Status Card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h2 className="flex gap-2 text-xl font-semibold text-gray-900">
              Thông tin bảo hành
            </h2>

            {/* Pending Delivery State */}
            {unit.warrantyStatus === "pending" && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-yellow-600" />
                  <p className="font-medium text-yellow-900">
                    Chờ kích hoạt bảo hành
                  </p>
                </div>
                <p className="mt-1 text-sm text-yellow-700">
                  Bảo hành sẽ được kích hoạt khi sản phẩm được giao thành công.
                </p>
              </div>
            )}

            {/* Owner View: Full warranty details */}
            {unit.warrantyStatus !== "pending" && isOwner && (
              <>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span
                      className={`font-semibold ${
                        warrantyInfo.status.isActive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {warrantyInfo.status.isActive ? "✓" : "✗"} {warrantyInfo.status.label}
                    </span>
                  </div>
                  {unit.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày kích hoạt:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(unit.deliveredAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                  {warrantyInfo.endDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ngày hết hạn:</span>
                      <span className="font-medium text-gray-900">
                        {warrantyInfo.endDate.toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  )}
                  {warrantyInfo.status.isActive && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thời gian còn lại:</span>
                      <span className="font-medium text-gray-900">
                        {warrantyInfo.daysRemaining} ngày
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Owner */}
                {warrantyInfo.status.isActive && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={`/p/${normalizedQrCode}/claim`}
                      className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Yêu cầu bảo hành
                    </Link>
                    <Link
                      href={`/p/${normalizedQrCode}/transfer`}
                      className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Chuyển quyền sở hữu
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Non-owner logged in view */}
            {unit.warrantyStatus !== "pending" && isLoggedIn && !isOwner && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-medium text-yellow-900">
                  Sản phẩm này không thuộc về tài khoản của bạn
                </p>
                <p className="mt-1 text-sm text-yellow-700">
                  Nếu bạn là chủ sở hữu mới, hãy liên hệ người bán để chuyển quyền
                  sở hữu.
                </p>
              </div>
            )}

            {/* Not logged in view */}
            {unit.warrantyStatus !== "pending" && !isLoggedIn && (
              <>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <span
                      className={`font-semibold ${
                        warrantyInfo.status.isActive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {warrantyInfo.status.isActive ? "✓" : "✗"} {warrantyInfo.status.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thời hạn bảo hành:</span>
                    <span className="font-medium text-gray-900">
                      {unit.warrantyMonths} tháng kể từ ngày giao hàng
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm text-blue-800">
                    Đăng nhập để xem thông tin bảo hành chi tiết và thực hiện các
                    yêu cầu bảo hành
                  </p>
                  <Link
                    href={`/login?redirect=/p/${normalizedQrCode}`}
                    className="mt-2 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Đăng nhập
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Cần hỗ trợ?
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Liên hệ với chúng tôi để được hỗ trợ về sản phẩm, bảo hành, hoặc các
          vấn đề khác.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/lien-he"
            className="inline-flex items-center justify-center rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Mail className="mr-2 h-5 w-5" />
            Liên hệ hỗ trợ
          </Link>
          <Link
            href="/chinh-sach-bao-hanh"
            className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FileText className="mr-2 h-5 w-5" />
            Chính sách bảo hành
          </Link>
        </div>
      </div>
    </main>
  );
}
