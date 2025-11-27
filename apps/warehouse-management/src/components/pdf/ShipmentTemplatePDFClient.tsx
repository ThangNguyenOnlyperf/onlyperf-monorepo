'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer, FileText, Package, QrCode } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { toast } from 'sonner';

interface ProductGroup {
  productId: string;
  productName: string;
  brand: string | null;
  model: string | null;
  itemCount: number;
}

interface ShipmentTemplatePDFClientProps {
  shipmentId: string;
  productGroups: ProductGroup[];
}

export default function ShipmentTemplatePDFClient({
  shipmentId,
  productGroups,
}: ShipmentTemplatePDFClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pdfData, setPdfData] = useState<{
    itemCount: number;
    pageCount: number;
    fileSize: number;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const generatePDF = useCallback(async (productId: string) => {
    setIsGenerating(true);
    startTransition(async () => {
      try {
        // Use streaming API endpoint with productId filter
        const response = await fetch(
          `/api/shipments/${shipmentId}/template-pdf?productId=${encodeURIComponent(productId)}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: undefined })) as { error?: string };
          throw new Error(errorData.error ?? 'Không thể tạo PDF');
        }

        // Get metadata from headers
        const itemCount = parseInt(response.headers.get('X-Item-Count') ?? '0', 10);
        const pageCount = parseInt(response.headers.get('X-Page-Count') ?? '0', 10);

        // Get blob directly (no base64 overhead)
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        setPdfBlob(blob);
        setPdfUrl(url);
        setPdfData({
          itemCount,
          pageCount,
          fileSize: blob.size,
        });

        toast.success(`Đã tạo PDF với ${itemCount} mã QR trên ${pageCount} trang`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo PDF');
      } finally {
        setIsGenerating(false);
      }
    });
  }, [shipmentId]);

  const handleProductSelect = (product: ProductGroup) => {
    // Clean up previous PDF
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfData(null);
    setPdfBlob(null);
    setSelectedProduct(product);
    void generatePDF(product.productId);
  };

  const handleDownload = () => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shipment-${shipmentId}-qr-template.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('PDF đã được tải xuống');
  };

  const handlePrint = () => {
    if (!pdfUrl) return;

    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleRegenerate = () => {
    if (!selectedProduct) return;
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfData(null);
    void generatePDF(selectedProduct.productId);
  };

  const handleBackToProducts = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setPdfData(null);
    setPdfBlob(null);
    setSelectedProduct(null);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Đang tạo PDF...
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Product selection view
  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Tạo PDF tem nhãn QR
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Chọn sản phẩm để tạo PDF tem nhãn
            </p>
          </div>

          {/* Product Cards */}
          {productGroups.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-gray-800">
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Không có sản phẩm có mã QR
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Lô hàng này chưa có sản phẩm nào được tạo mã QR
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productGroups.map((product) => (
                <Card
                  key={product.productId}
                  className="p-6 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] border-2 border-transparent hover:border-primary/30"
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {product.productName}
                      </h3>
                      {(product.brand || product.model) && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {[product.brand, product.model].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          {product.itemCount} tem nhãn
                        </span>
                        <span className="text-xs text-gray-400">
                          ({Math.ceil(product.itemCount / 44)} trang)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // PDF view (after product selected)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToProducts}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Chọn sản phẩm khác
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {selectedProduct.productName}
            </span>
          </div>

          {pdfData && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={isPending}
                className="hover:bg-primary/10"
              >
                <FileText className="mr-2 h-4 w-4" />
                Tạo lại
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!pdfUrl}
                className="hover:bg-primary/10"
              >
                <Printer className="mr-2 h-4 w-4" />
                In
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!pdfBlob}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Download className="mr-2 h-4 w-4" />
                Tải xuống
              </Button>
            </div>
          )}
        </div>

        {/* PDF Info Card */}
        {pdfData && (
          <Card className="p-6 mb-6 bg-white dark:bg-gray-800 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Sản phẩm
                </p>
                <p className="text-lg font-bold text-amber-700 dark:text-amber-300 truncate">
                  {selectedProduct.productName}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Số lượng QR
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {pdfData.itemCount}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Số trang
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {pdfData.pageCount}
                </p>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Kích thước
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {(pdfData.fileSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* PDF Preview */}
        {pdfUrl && (
          <Card className="overflow-hidden shadow-xl">
            <iframe
              src={pdfUrl}
              className="w-full h-[calc(100vh-300px)] min-h-[600px]"
              title="PDF Preview"
            />
          </Card>
        )}

        {/* Error State */}
        {!isGenerating && !pdfData && (
          <Card className="p-12 text-center bg-white dark:bg-gray-800">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Không thể tạo PDF
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Vui lòng thử lại hoặc quay lại chọn sản phẩm khác
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={handleBackToProducts}>
                Chọn sản phẩm khác
              </Button>
              <Button onClick={handleRegenerate} disabled={isPending}>
                Thử lại
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

