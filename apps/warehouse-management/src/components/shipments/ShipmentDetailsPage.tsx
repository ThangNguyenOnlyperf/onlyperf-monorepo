'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ShipmentWithItems } from '~/actions/shipmentActions';
import type { GroupedQRItems } from '~/actions/types';
import {
  Package,
  Calendar,
  Building2,
  Hash,
  ChevronLeft,
  FileText,
  QrCode,
  Clock,
  CheckCircle,
  ShoppingCart,
  Truck,
  Filter,
  RefreshCw,
  Loader2,
  Settings2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { syncShipmentInventoryAction } from '~/actions/shopify/inventoryActions';
import { SHOPIFY_ENABLED } from '~/lib/shopify/config';
import BadgeConfigModal from '~/components/badges/BadgeConfigModal';

interface ShipmentDetailsPageProps {
  shipment: ShipmentWithItems;
  groupedItems: GroupedQRItems[];
  highlightedQrCode?: string;
}

export default function ShipmentDetailsPage({
  shipment,
  groupedItems,
  highlightedQrCode,
}: ShipmentDetailsPageProps) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'received'>('all');
  const [isSyncing, startSyncTransition] = useTransition();
  const [badgeConfigOpen, setBadgeConfigOpen] = useState(false);

  const handleSyncShopify = () => {
    if (!SHOPIFY_ENABLED) {
      return;
    }

    startSyncTransition(async () => {
      try {
        const result = await syncShipmentInventoryAction(shipment.id);
        const results = result.data?.results ?? [];

        if (results.length === 0) {
          if (result.success) {
            toast.success('Không có sản phẩm nào cần đồng bộ Shopify');
            router.refresh();
          } else {
            toast.error(result.error ?? result.message ?? 'Không thể đồng bộ Shopify');
          }
          return;
        }

        const successCount = results.filter(item => item.status === 'success').length;
        const errorCount = results.filter(item => item.status === 'error').length;
        const skippedCount = results.filter(item => item.status === 'skipped').length;
        const total = results.length;

        if (errorCount === 0) {
          if (successCount === 0 && skippedCount > 0) {
            toast.success('Tất cả sản phẩm đã được bỏ qua vì chưa liên kết Shopify');
          } else {
            toast.success(`Đã đồng bộ Shopify cho ${successCount}/${total} sản phẩm`);
          }
          router.refresh();
          return;
        }

        if (successCount > 0) {
          toast.warning(`Đã đồng bộ Shopify cho ${successCount}/${total} sản phẩm. ${errorCount} sản phẩm lỗi.`);
          router.refresh();
          return;
        }

        toast.error(result.error ?? result.message ?? 'Không thể đồng bộ Shopify');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Không thể đồng bộ Shopify';
        toast.error(message);
      }
    });
  };

  // Utility functions for status styling
  const getItemStatusStyles = (status?: string) => {
    const baseClasses = "border-2 rounded-lg px-3 py-2 transition-all duration-200 text-sm font-mono";
    
    switch (status) {
      case 'received':
        return `${baseClasses} bg-green-50 border-green-500 hover:bg-green-100`;
      case 'sold':
        return `${baseClasses} bg-blue-50 border-blue-400 hover:bg-blue-100`;
      case 'shipped':
        return `${baseClasses} bg-purple-50 border-purple-400 hover:bg-purple-100`;
      case 'pending':
      default:
        return `${baseClasses} bg-gray-50 border-gray-300 border-dashed hover:bg-gray-100`;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'received':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'sold':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'shipped':
        return <Truck className="w-4 h-4 text-purple-600" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      pending: 'Chưa nhận',
      received: 'Đã nhận',
      sold: 'Đã bán',
      shipped: 'Đã giao',
    };
    return labels[status ?? 'pending'] ?? 'Chưa nhận';
  };

  // Filter items based on selected status
  const filteredGroupedItems = groupedItems.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'pending') return !item.status || item.status === 'pending';
      if (filterStatus === 'received') return item.status === 'received';
      return true;
    })
  })).filter(group => group.items.length > 0);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Đang chờ', variant: 'secondary' as const },
      received: { label: 'Đã nhận', variant: 'default' as const },
      completed: { label: 'Hoàn thành', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/shipments')}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </Button>
          <h1 className="text-2xl font-bold">
            Phiếu nhập #{shipment.receiptNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {SHOPIFY_ENABLED ? (
            <Button
              variant="default"
              size="sm"
              disabled={isSyncing}
              onClick={handleSyncShopify}
              className="gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Đồng bộ Shopify
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBadgeConfigOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Cấu hình tem nhãn
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/shipments/${shipment.id}/pdf`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Xem PDF
          </Button>
        </div>
      </div>

      {/* Shipment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin phiếu nhập</CardTitle>
          <CardDescription>
            Chi tiết thông tin về phiếu nhập và nhà cung cấp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Số phiếu:</span>
                <span className="font-medium">{shipment.receiptNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ngày nhập:</span>
                <span className="font-medium">
                  {format(new Date(shipment.receiptDate), 'dd/MM/yyyy', { locale: vi })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Nhà cung cấp:</span>
                <span className="font-medium">{shipment.supplierName}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng số lượng:</span>
                <span className="font-medium">{shipment.itemCount} sản phẩm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Trạng thái:</span>
                {getStatusBadge(shipment.status)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ngày tạo:</span>
                <span className="font-medium">
                  {format(new Date(shipment.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              </div>
            </div>
          </div>
          {shipment.notes && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Ghi chú</h4>
              <p className="text-sm">{shipment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Danh sách sản phẩm</CardTitle>
                <CardDescription>
                  {filteredGroupedItems.length} loại sản phẩm
                  {filterStatus !== 'all' && ` (Lọc: ${getStatusLabel(filterStatus)})`}
                </CardDescription>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className="gap-1"
              >
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                className="gap-1"
              >
                <Clock className="h-4 w-4" />
                Chưa nhận
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'received' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('received')}
                className="gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Đã nhận
              </Button>
            </div>
            
            {/* Status Legend */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Chú thích trạng thái:</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-50 border-2 border-gray-300 border-dashed rounded"></div>
                  <span className="text-xs">Chưa nhận</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-50 border-2 border-green-500 rounded"></div>
                  <span className="text-xs">Đã nhận</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-50 border-2 border-blue-400 rounded"></div>
                  <span className="text-xs">Đã bán</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-purple-50 border-2 border-purple-400 rounded"></div>
                  <span className="text-xs">Đã giao</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGroupedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Không có sản phẩm nào với trạng thái "{getStatusLabel(filterStatus)}"</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('all')}
                className="mt-3"
              >
                Xem tất cả
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroupedItems.map((group, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 space-y-3 transition-all ${
                  group.items.some(item => item.qrCode === highlightedQrCode)
                    ? "border-green-500 bg-green-50"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      {group.brand} - {group.model}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Số lượng: {group.items.length}
                    </p>
                  </div>
                  <Link
                    href={`/shipments/${shipment.id}/scan`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <QrCode className="h-3 w-3" />
                    Quét mã
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const isHighlighted = highlightedQrCode === item.qrCode;
                    return (
                      <Link
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="inline-block"
                      >
                        <div
                          className={`${getItemStatusStyles(item.status)} ${
                            isHighlighted
                              ? "ring-2 ring-green-500 ring-offset-2 animate-pulse"
                              : ""
                          } cursor-pointer relative`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{item.qrCode}</span>
                            {getStatusIcon(item.status)}
                          </div>
                          <div className="text-xs mt-1 text-center opacity-75">
                            {getStatusLabel(item.status)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Config Modal */}
      <BadgeConfigModal
        open={badgeConfigOpen}
        onOpenChange={setBadgeConfigOpen}
        onConfirm={() => {
          // After config is saved, could optionally redirect to PDF page
          // router.push(`/shipments/${shipment.id}/pdf`);
        }}
      />
    </div>
  );
}
