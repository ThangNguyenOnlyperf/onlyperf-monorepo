'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { ScrollArea } from '~/components/ui/scroll-area';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ShipmentWithItems } from '~/actions/shipmentActions';
import { getShipmentWithItemsAction } from '~/actions/shipmentActions';
import type { GroupedQRItems } from '~/actions/types';
import { Package, Calendar, Building2, Hash } from 'lucide-react';

interface ShipmentDetailsModalProps {
  shipment: ShipmentWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShipmentDetailsModal({
  shipment,
  open,
  onOpenChange,
}: ShipmentDetailsModalProps) {
  const [isPending, startTransition] = useTransition();
  const [groupedItems, setGroupedItems] = useState<GroupedQRItems[]>([]);

  useEffect(() => {
    if (open && shipment) {
      startTransition(async () => {
        const result = await getShipmentWithItemsAction(shipment.id);
        if (result.success && result.data) {
          setGroupedItems(result.data.groupedItems);
        }
      });
    }
  }, [open, shipment]);

  if (!shipment) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Chi tiết phiếu nhập #{shipment.receiptNumber}</DialogTitle>
          <DialogDescription>
            Thông tin chi tiết về phiếu nhập và danh sách sản phẩm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shipment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Số phiếu:</span>
                <span className="font-medium">{shipment.receiptNumber}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ngày nhập:</span>
                <span className="font-medium">
                  {format(new Date(shipment.receiptDate), 'dd/MM/yyyy', { locale: vi })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nhà cung cấp:</span>
                <span className="font-medium">{shipment.supplierName}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tổng số lượng:</span>
                <span className="font-medium">{shipment.itemCount} sản phẩm</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Trạng thái:</span>
                {getStatusBadge(shipment.status)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Ngày tạo:</span>
                <span className="font-medium">
                  {format(new Date(shipment.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </span>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div>
            <h3 className="font-semibold mb-3">Danh sách sản phẩm</h3>
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-4 space-y-4">
                {isPending ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[300px]" />
                      </div>
                    ))}
                  </>
                ) : (
                  // Grouped items
                  groupedItems.map((group, index) => (
                    <div key={index} className="space-y-2">
                      <div className="font-medium">
                        {group.brand} - {group.model}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Số lượng: {group.items.length} | Mã QR:{' '}
                        {group.items.map((item) => item.qrCode).join(', ')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Notes */}
          {shipment.notes && (
            <div>
              <h3 className="font-semibold mb-2">Ghi chú</h3>
              <p className="text-sm text-muted-foreground">{shipment.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}