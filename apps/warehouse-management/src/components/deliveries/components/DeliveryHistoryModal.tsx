'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { 
  History, 
  Clock, 
  User, 
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DeliveryWithOrder } from '../types';
import { getDeliveryHistory } from '~/actions/deliveryActions';
import { toast } from 'sonner';

interface DeliveryHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryWithOrder | null;
}

interface HistoryEntry {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  notes?: string | null;
  changedBy?: string | null;
  changedByName?: string;
  createdAt: Date;
}

export default function DeliveryHistoryModal({
  open,
  onOpenChange,
  delivery,
}: DeliveryHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && delivery) {
      startTransition(async () => {
        try {
          const result = await getDeliveryHistory(delivery.id);
          if (result.success && result.data) {
            setHistory(result.data);
          } else {
            toast.error('Lỗi', {
              description: result.message || 'Không thể tải lịch sử giao hàng',
            });
          }
        } catch (error) {
          console.error('Error fetching delivery history:', error);
          toast.error('Lỗi', {
            description: 'Không thể tải lịch sử giao hàng',
          });
        }
      });
    }
  }, [open, delivery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting_for_delivery':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      default:
        if (status.startsWith('resolution_')) {
          return <Package className="h-4 w-4 text-blue-600" />;
        }
        return <Truck className="h-4 w-4 text-primary" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting_for_delivery':
        return 'Chờ giao hàng';
      case 'delivered':
        return 'Đã giao thành công';
      case 'failed':
        return 'Giao thất bại';
      case 'cancelled':
        return 'Đã hủy';
      case 'resolution_re_import':
        return 'Tạo quy trình: Nhập lại kho';
      case 'resolution_return_to_supplier':
        return 'Tạo quy trình: Trả về nhà cung cấp';
      case 'resolution_retry_delivery':
        return 'Tạo quy trình: Giao lại';
      case 'resolution_in_progress':
        return 'Đang xử lý quy trình';
      case 'resolution_completed':
        return 'Hoàn thành quy trình xử lý';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect card-shadow max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Lịch sử giao hàng
          </DialogTitle>
          <DialogDescription>
            Theo dõi lịch sử thay đổi trạng thái cho đơn #{delivery?.order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        {delivery && (
          <div className="space-y-4">
            {/* Current Status */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Trạng thái hiện tại</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(delivery.status)}
                    <span className="font-medium">{getStatusLabel(delivery.status)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Cập nhật lần cuối</p>
                  <p className="text-sm font-medium">
                    {format(new Date(delivery.updatedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                </div>
              </div>
            </div>

            {/* History Timeline */}
            <div>
              <h3 className="font-medium mb-3">Lịch sử thay đổi</h3>
              <ScrollArea className="h-[400px] pr-4">
                {isPending ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                    Đang tải lịch sử...
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={entry.id} className="relative">
                        {/* Timeline line */}
                        {index < history.length - 1 && (
                          <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
                        )}
                        
                        <div className="flex gap-4">
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border-2 border-border flex items-center justify-center">
                            {getStatusIcon(entry.toStatus)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pb-8">
                            <div className="bg-background border rounded-lg p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {entry.fromStatus && (
                                    <>
                                      <Badge variant="outline" className="text-xs">
                                        {getStatusLabel(entry.fromStatus)}
                                      </Badge>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    </>
                                  )}
                                  <Badge className="text-xs">
                                    {getStatusLabel(entry.toStatus)}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                </div>
                              </div>
                              
                              {entry.notes && (
                                <p className="text-sm text-muted-foreground">{entry.notes}</p>
                              )}
                              
                              {entry.changedByName && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span>Bởi: {entry.changedByName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có lịch sử thay đổi
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}