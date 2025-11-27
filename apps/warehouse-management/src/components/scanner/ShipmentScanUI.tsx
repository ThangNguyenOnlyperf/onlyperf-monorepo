'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { toast } from 'sonner';
import InboundScanSheet from './InboundScanSheet';
import type { Storage } from '~/actions/storageActions';
import type { ShipmentWithItems } from '~/actions/shipmentActions';
import { getShipmentScanProgressAction, bulkUpdateShipmentItemsAction, reconcileShipmentStatusAction } from '~/actions/scanActions';
import {
  Package,
  CheckCircle,
  Clock,
  ScanLine,
  AlertCircle,
  ArrowLeft,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface ShipmentScanUIProps {
  shipment: ShipmentWithItems;
  storages: Storage[];
}

export default function ShipmentScanUI({ shipment, storages }: ShipmentScanUIProps) {
  const router = useRouter();
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    totalItems: shipment.itemCount,
    scannedItems: 0,
    pendingItems: shipment.itemCount,
  });
  const [isPending, startTransition] = useTransition();

  // Load scan progress on mount
  useEffect(() => {
    void loadScanProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipment.id]);

  const loadScanProgress = async () => {
    const result = await getShipmentScanProgressAction(shipment.id);
    if (result.success && result.data) {
      setScanProgress(result.data);
      
      // Automatically update shipment status if all items are scanned
      if (result.data.totalItems > 0 && result.data.scannedItems === result.data.totalItems) {
        void reconcileShipmentStatusAction(shipment.id);
      }
    }
  };

  const handleBulkReceive = async () => {
    if (storages.length === 0) {
      toast.error('Vui lòng tạo kho trước khi nhận hàng');
      return;
    }

    const defaultStorage = storages[0];
    if (!defaultStorage) return;

    const confirmed = confirm(
      `Xác nhận nhận tất cả ${scanProgress.pendingItems} sản phẩm còn lại vào kho ${defaultStorage.name}?`
    );
    
    if (!confirmed) return;

    startTransition(async () => {
      const result = await bulkUpdateShipmentItemsAction(shipment.id, defaultStorage.id);
      if (result.success) {
        toast.success(result.message);
        
        void reconcileShipmentStatusAction(shipment.id);
        
        // Reload progress
        await loadScanProgress();
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/shipments');
        }, 1500);
      } else {
        toast.error(result.error ?? 'Lỗi khi nhận hàng');
      }
    });
  };

  const handleScanComplete = async () => {
    await loadScanProgress();
    
    // Check if all items are scanned and update status
    const progressResult = await getShipmentScanProgressAction(shipment.id);
    if (progressResult.success && progressResult.data) {
      if (progressResult.data.scannedItems === progressResult.data.totalItems) {
        void reconcileShipmentStatusAction(shipment.id);
        toast.success('Đã hoàn thành nhận hàng cho phiếu nhập này!');
        
        setTimeout(() => {
          router.push('/shipments');
        }, 1500);
      }
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link 
        href="/shipments" 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Quay lại danh sách phiếu nhập
      </Link>

      {/* Shipment Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Thông tin phiếu nhập</CardTitle>
              <CardDescription>
                Nhà cung cấp: {shipment.supplierName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {shipment.status === 'received' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
              <span className="text-sm font-medium">
                {shipment.status === 'received' ? 'Đã nhận' : 'Đang chờ'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ngày nhập</p>
              <p className="font-medium">{new Date(shipment.receiptDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tổng số lượng</p>
              <p className="font-medium">{shipment.itemCount} sản phẩm</p>
            </div>
          </div>
          
          {shipment.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Ghi chú</p>
              <p className="text-sm">{shipment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scan Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Tiến độ quét</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <Package className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-2xl font-bold">{scanProgress.totalItems}</p>
              <p className="text-xs text-muted-foreground">Tổng số</p>
            </div>
            <div className="space-y-1">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
              <p className="text-2xl font-bold text-green-600">{scanProgress.scannedItems}</p>
              <p className="text-xs text-muted-foreground">Đã quét</p>
            </div>
            <div className="space-y-1">
              <Clock className="h-8 w-8 mx-auto text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">{scanProgress.pendingItems}</p>
              <p className="text-xs text-muted-foreground">Chờ quét</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Thao tác</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {storages.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-yellow-600 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                Vui lòng <Link href="/storages" className="underline">tạo kho</Link> trước khi quét nhập hàng
              </p>
            </div>
          ) : (
            <>
              <Button 
                onClick={() => setIsScanOpen(true)}
                className="w-full"
                size="lg"
                disabled={scanProgress.pendingItems === 0}
              >
                <ScanLine className="mr-2 h-5 w-5" />
                {scanProgress.pendingItems === 0 
                  ? 'Đã quét xong tất cả sản phẩm'
                  : 'Quét mã QR sản phẩm'
                }
              </Button>

              {scanProgress.pendingItems > 0 && (
                <Button
                  onClick={handleBulkReceive}
                  variant="outline"
                  className="w-full"
                  disabled={isPending}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Nhận tất cả {scanProgress.pendingItems} sản phẩm còn lại
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href={`/shipments/${shipment.id}/pdf`}>
                  <FileText className="mr-2 h-5 w-5" />
                  Xem file PDF
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scan Sheet */}
      <InboundScanSheet
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
        storages={storages}
        shipment={shipment}
        onScanComplete={handleScanComplete}
        onProgressUpdate={loadScanProgress}
      />
    </div>
  );
}