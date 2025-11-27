'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu';
import { 
  Eye, 
  Edit, 
  AlertTriangle, 
  History, 
  MoreHorizontal, 
  Phone, 
  User, 
  Package,
  Clock,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DeliveryStatusBadge, ResolutionStatusBadge } from './DeliveryStatusBadge';
import type { DeliveryWithOrder } from '../types';
import { FAILURE_CATEGORY_LABELS, RESOLUTION_TYPE_LABELS } from '../types';
import { useRouter } from 'next/navigation';

interface DeliveryTableProps {
  deliveries: DeliveryWithOrder[];
  onStatusUpdate: (delivery: DeliveryWithOrder) => void;
  onFailureResolution: (delivery: DeliveryWithOrder) => void;
  onViewHistory: (delivery: DeliveryWithOrder) => void;
}

export default function DeliveryTable({
  deliveries,
  onStatusUpdate,
  onFailureResolution,
  onViewHistory,
}: DeliveryTableProps) {
  const router = useRouter();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Không có dữ liệu giao hàng
      </div>
    );
  }

  return (
    <div className="rounded-md border card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 first:rounded-tl-md w-[120px]">Mã đơn</TableHead>
            <TableHead className="bg-muted/50">Khách hàng</TableHead>
            <TableHead className="bg-muted/50">Shipper</TableHead>
            <TableHead className="bg-muted/50">Trạng thái giao</TableHead>
            <TableHead className="bg-muted/50">Xử lý thất bại</TableHead>
            <TableHead className="bg-muted/50 text-right">Giá trị</TableHead>
            <TableHead className="bg-muted/50">Ngày tạo</TableHead>
            <TableHead className="bg-muted/50 text-center last:rounded-tr-md w-[100px]">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow 
              key={delivery.id} 
              className="hover:bg-primary/5 transition-all duration-200"
            >
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {delivery.order.orderNumber}
                  </Badge>
                  {delivery.trackingNumber && (
                    <div className="text-xs text-muted-foreground">
                      MVD: {delivery.trackingNumber}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{delivery.order.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{delivery.order.customer.phone}</span>
                  </div>
                  {delivery.order.customer.address && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{delivery.order.customer.address}</span>
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium">{delivery.shipperName}</div>
                  {delivery.shipperPhone && (
                    <div className="text-sm text-muted-foreground">
                      {delivery.shipperPhone}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-2">
                  <DeliveryStatusBadge status={delivery.status} />
                  {delivery.deliveredAt && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(delivery.deliveredAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell>
                {delivery.status === 'failed' ? (
                  <div className="space-y-2">
                    {delivery.resolution ? (
                      <>
                        <ResolutionStatusBadge status={delivery.resolution.resolutionStatus} />
                        <div className="text-xs text-muted-foreground">
                          {RESOLUTION_TYPE_LABELS[delivery.resolution.resolutionType]}
                        </div>
                      </>
                    ) : delivery.failureCategory ? (
                      <div className="text-xs text-muted-foreground">
                        {FAILURE_CATEGORY_LABELS[delivery.failureCategory]}
                      </div>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Cần xử lý
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>

              <TableCell className="text-right">
                <div className="space-y-1">
                  <div className="font-medium">
                    {formatCurrency(delivery.order.totalAmount)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Package className="h-3 w-3" />
                    {delivery.order.items.length} mặt hàng
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">
                  {format(new Date(delivery.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(delivery.createdAt), 'HH:mm', { locale: vi })}
                </div>
              </TableCell>

              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => onStatusUpdate(delivery)}
                      className="flex items-center gap-2 cursor-pointer"
                      disabled={delivery.status === 'delivered' || delivery.status === 'cancelled'}
                    >
                      <Edit className="h-4 w-4" />
                      Cập nhật trạng thái
                    </DropdownMenuItem>
                    
                    {delivery.status === 'failed' && !delivery.resolution && (
                      <DropdownMenuItem 
                        onClick={() => onFailureResolution(delivery)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Xử lý thất bại
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={() => onViewHistory(delivery)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <History className="h-4 w-4" />
                      Xem lịch sử
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      onClick={() => router.push(`/orders/${delivery.orderId}`)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      Chi tiết đơn hàng
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}