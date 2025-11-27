'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import {
  Download,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  Building2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import OrderItemsTable from './OrderItemsTable';
import OrderCustomerInfo from './OrderCustomerInfo';
import { generateOrderExcelById } from '~/actions/orderActions';
import type { OrderDetail } from '~/actions/orderActions';
import type { Color } from '~/lib/schemas/colorSchema';
import { getDeliveryStatusBadge, getPaymentStatusBadge } from '~/lib/orderStatusHelpers';

interface OrderDetailClientUIProps {
  order: OrderDetail;
  colors?: Color[];
}

export default function OrderDetailClientUI({ order, colors = [] }: OrderDetailClientUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const result = await generateOrderExcelById(order.id);
      
      if (result.success && result.data) {
        // Convert base64 to blob
        const binaryData = atob(result.data.excelData);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        // Create download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.data.fileName;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Đã tải xuống file Excel');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Lỗi khi tạo file Excel');
    } finally {
      setIsDownloading(false);
    }
  };


  const handleBackToOutbound = () => {
    router.push('/outbound');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToOutbound}
            className="hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Đơn hàng #{order.orderNumber}
              {getDeliveryStatusBadge(order.deliveryStatus)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <Calendar className="inline h-3 w-3 mr-1" />
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        
        <Button
          size="sm"
          onClick={handleDownloadExcel}
          disabled={isDownloading}
          className="bg-gradient-to-r from-primary to-primary/90 hover:scale-[1.02] active:scale-[0.98] button-shine"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Đang tạo...' : 'Tải Excel'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Card */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Chi tiết sản phẩm ({order.items?.length ?? 0} sản phẩm)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrderItemsTable items={order.items ?? []} colors={colors} />
              
              <Separator className="my-4" />
              
              {/* Order Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tổng tiền hàng:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
                {order.voucherCode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mã giảm giá:</span>
                    <Badge variant="secondary">{order.voucherCode}</Badge>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng thanh toán:</span>
                  <span className="text-primary">{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Customer & Payment Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <OrderCustomerInfo 
            customer={order.customer}
            provider={order.provider}
            customerType={order.customerType}
          />

          {/* Payment Information */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Thông tin thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Phương thức:</span>
                <Badge variant="outline">
                  {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Trạng thái:</span>
                {getPaymentStatusBadge(order.paymentStatus)}
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nhân viên xử lý:</span>
                <span className="text-sm font-medium">
                  {order.processedBy?.name ?? order.processedBy?.email ?? 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          {order.notes && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-base">Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
