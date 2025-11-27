"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CheckCircle2, AlertCircle, Package } from "lucide-react";
import QRScanner from "~/components/scanner/QRScanner";
import { scanAndFulfillItemAction, getOrderFulfillmentDetailsAction } from "~/actions/fulfillmentActions";
import type { PendingOrder, OrderFulfillmentDetails } from "~/actions/fulfillmentActions";
import { toast } from "sonner";
import { useEffect } from "react";

interface FulfillmentScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PendingOrder;
}

export default function FulfillmentScanner({
  open,
  onOpenChange,
  order,
}: FulfillmentScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderFulfillmentDetails | null>(null);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());

  // Load order details when opened
  useEffect(() => {
    if (open) {
      loadOrderDetails();
    }
  }, [open, order.orderId]);

  const loadOrderDetails = async () => {
    const result = await getOrderFulfillmentDetailsAction(order.orderId);
    if (result.success && result.data) {
      setOrderDetails(result.data);
    }
  };

  const handleScan = async (qrCode: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const result = await scanAndFulfillItemAction(order.orderId, qrCode);

      if (!result.success || !result.data) {
        toast.error(result.message);
        setIsProcessing(false);
        return;
      }

      const scanResult = result.data;

      if (scanResult.orderItemId) {
        setScannedItems((prev) => new Set([...prev, scanResult.orderItemId!]));
      }

      // Refresh order details
      await loadOrderDetails();

      if (scanResult.orderFulfilled) {
        toast.success("🎉 Đơn hàng đã hoàn thành!", {
          description: "Tất cả sản phẩm đã được quét",
        });
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      } else {
        toast.success(scanResult.message, {
          description: `Còn ${scanResult.remainingItems} sản phẩm`,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      toast.error("Lỗi khi quét mã QR");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setScannedItems(new Set());
    onOpenChange(false);
  };

  const details = orderDetails ?? order;
  const requiredProducts = ("requiredProducts" in details ? details.requiredProducts : []) as Array<{
    productId: string;
    productName: string;
    brand: string;
    model: string;
    color: string;
    quantityNeeded: number;
    quantityFulfilled: number;
  }>;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Quét QR - {order.orderNumber}
            {order.shopifyOrderNumber && (
              <Badge variant="outline">{order.shopifyOrderNumber}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {order.customerName} - {order.customerPhone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Scanner - Moved to top for better accessibility */}
          {details.fulfilledItems < details.totalItems && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Quét mã QR trên tem nhãn sản phẩm</span>
              </div>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-4">
                <QRScanner onScan={handleScan} isOpen={open} />
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Tiến độ</span>
              <span className="text-muted-foreground">
                {details.fulfilledItems} / {details.totalItems} sản phẩm
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(10, (details.fulfilledItems / details.totalItems) * 100)}%`,
                }}
              >
                {details.fulfilledItems > 0 && (
                  <span className="text-xs text-white font-medium">
                    {Math.round((details.fulfilledItems / details.totalItems) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Required Products */}
          <div className="space-y-3">
            <h3 className="font-medium">Sản phẩm cần quét:</h3>
            <div className="space-y-2">
              {requiredProducts.length > 0 ? (
                requiredProducts.map((product) => (
                  <div
                    key={product.productId}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      product.quantityFulfilled === product.quantityNeeded
                        ? "bg-green-50 border-green-200"
                        : "bg-background border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {product.quantityFulfilled === product.quantityNeeded ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {product.brand} - {product.model}
                        </p>
                        {product.color && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {product.color}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={
                        product.quantityFulfilled === product.quantityNeeded
                          ? "default"
                          : "secondary"
                      }
                      className={
                        product.quantityFulfilled === product.quantityNeeded
                          ? "bg-green-500"
                          : ""
                      }
                    >
                      {product.quantityFulfilled}/{product.quantityNeeded}
                    </Badge>
                  </div>
                ))
              ) : (
                // Fallback for when requiredProducts isn't available
                details.items
                  .reduce((acc, item) => {
                    const existing = acc.find((i) => i.productId === item.productId);
                    if (existing) {
                      existing.total++;
                      if (item.fulfillmentStatus === "fulfilled") {
                        existing.fulfilled++;
                      }
                    } else {
                      acc.push({
                        productId: item.productId,
                        productName: item.productName,
                        brand: item.brand,
                        model: item.model,
                        color: item.color,
                        total: 1,
                        fulfilled: item.fulfillmentStatus === "fulfilled" ? 1 : 0,
                      });
                    }
                    return acc;
                  }, [] as Array<{ productId: string; productName: string; brand: string; model: string; color: string; total: number; fulfilled: number }>)
                  .map((product) => (
                    <div
                      key={product.productId}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        product.fulfilled === product.total
                          ? "bg-green-50 border-green-200"
                          : "bg-background border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {product.fulfilled === product.total ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">
                            {product.brand} - {product.model}
                          </p>
                          {product.color && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {product.color}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          product.fulfilled === product.total
                            ? "default"
                            : "secondary"
                        }
                        className={
                          product.fulfilled === product.total
                            ? "bg-green-500"
                            : ""
                        }
                      >
                        {product.fulfilled}/{product.total}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Complete Status */}
          {details.fulfilledItems === details.totalItems && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-900">Đơn hàng đã hoàn thành!</p>
              <p className="text-sm text-green-700 mt-1">
                Tất cả sản phẩm đã được quét. Sẵn sàng để giao hàng.
              </p>
              <Button className="mt-4" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
