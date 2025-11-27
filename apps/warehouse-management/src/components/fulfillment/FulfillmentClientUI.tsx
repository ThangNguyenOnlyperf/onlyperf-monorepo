"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Package, CheckCircle2, Clock, QrCode } from "lucide-react";
import { MetricCard } from "~/components/ui/metric-card";
import type { PendingOrder } from "~/actions/fulfillmentActions";
import FulfillmentScanner from "./FulfillmentScanner";
import { getPendingShopifyOrdersAction } from "~/actions/fulfillmentActions";

interface FulfillmentClientUIProps {
  initialOrders: PendingOrder[];
}

export default function FulfillmentClientUI({ initialOrders }: FulfillmentClientUIProps) {
  const [orders, setOrders] = useState<PendingOrder[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refreshOrders = () => {
    startTransition(async () => {
      const result = await getPendingShopifyOrdersAction();
      if (result.success && result.data) {
        setOrders(result.data);
      }
    });
  };

  const handleStartFulfillment = (order: PendingOrder) => {
    setSelectedOrder(order);
    setIsScannerOpen(true);
  };

  const handleScannerClose = () => {
    setIsScannerOpen(false);
    refreshOrders();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const pendingCount = orders.filter((o) => o.fulfilledItems < o.totalItems).length;
  const fulfilledCount = orders.filter((o) => o.fulfilledItems === o.totalItems).length;

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Xử lý đơn hàng Shopify</h1>
          <p className="text-muted-foreground mt-1">
            Quét QR code để hoàn thành đơn hàng online
          </p>
        </div>
        <Button onClick={refreshOrders} disabled={isPending}>
          {isPending ? "Đang tải..." : "Làm mới"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Đơn chờ xử lý"
          value={pendingCount}
          description="Cần quét QR"
          variant="amber"
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Đã hoàn thành"
          value={fulfilledCount}
          description="Sẵn sàng giao hàng"
          variant="emerald"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Tổng đơn hàng"
          value={orders.length}
          description="Đơn Shopify"
          variant="blue"
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Không có đơn hàng chờ xử lý
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <Card
              key={order.orderId}
              className="card-shadow hover:shadow-lg transition-all duration-200"
            >
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                      <span className="break-all">{order.orderNumber}</span>
                      {order.shopifyOrderNumber && (
                        <Badge variant="outline" className="font-normal text-xs">
                          {order.shopifyOrderNumber}
                        </Badge>
                      )}
                      {order.fulfilledItems === order.totalItems ? (
                        <Badge className="bg-green-500 text-xs">Đã hoàn thành</Badge>
                      ) : order.fulfilledItems > 0 ? (
                        <Badge className="bg-amber-500 text-xs">Đang xử lý</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Chờ quét</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {order.customerName} - {order.customerPhone}
                    </CardDescription>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-base sm:text-lg font-bold text-primary">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Tiến độ quét</span>
                    <span className="font-medium">
                      {order.fulfilledItems} / {order.totalItems} sản phẩm
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(order.fulfilledItems / order.totalItems) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium">Sản phẩm cần quét:</p>
                  <div className="space-y-1">
                    {order.items
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
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm p-1.5 sm:p-2 bg-muted/50 rounded"
                        >
                          <div className="flex-1">
                            <span className="font-medium">{product.brand}</span>
                            {" - "}
                            <span>{product.model}</span>
                            {product.color && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {product.color}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                product.fulfilled === product.total
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {product.fulfilled}/{product.total}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Action Button */}
                {order.fulfilledItems < order.totalItems && (
                  <Button
                    className="w-full"
                    onClick={() => handleStartFulfillment(order)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Bắt đầu quét QR
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Scanner Modal */}
      {selectedOrder && (
        <FulfillmentScanner
          open={isScannerOpen}
          onOpenChange={handleScannerClose}
          order={selectedOrder}
        />
      )}
    </div>
  );
}
