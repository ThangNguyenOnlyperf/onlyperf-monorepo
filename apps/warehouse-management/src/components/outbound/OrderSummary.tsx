'use client';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ShoppingBag, Package, DollarSign, CheckCircle } from 'lucide-react';
import type { CartItem } from './types';

interface OrderSummaryProps {
  items: CartItem[];
  total: number;
  onConfirm: () => void;
  isPending: boolean;
}

export default function OrderSummary({ items, total, onConfirm, isPending }: OrderSummaryProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const uniqueProducts = new Set(items.map(item => `${item.brand}-${item.model}`)).size;

  return (
    <Card className="card-shadow bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-emerald-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Tổng kết đơn hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-4 w-4" />
              Tổng sản phẩm
            </p>
            <p className="text-2xl font-bold">{items.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Loại sản phẩm</p>
            <p className="text-2xl font-bold">{uniqueProducts}</p>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tạm tính:</span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Giảm giá:</span>
            <span className="font-medium">0 ₫</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tổng thanh toán:
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
              {formatPrice(total)}
            </span>
          </div>

          {/* Status badges */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/10 to-blue-600/10">
                {items.length} mã QR đã quét
              </Badge>
              <Badge variant="secondary" className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
                Sẵn sàng xử lý
              </Badge>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={onConfirm}
            disabled={items.length === 0 || isPending}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:scale-[1.02] active:scale-[0.98] button-shine text-white font-semibold"
            size="lg"
          >
            {isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Xác nhận đơn hàng
              </>
            )}
          </Button>

          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Vui lòng quét sản phẩm trước khi xác nhận
            </p>
          )}
        </div>

        {/* Info Note */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• File Excel sẽ được tải xuống sau khi xác nhận</p>
          <p>• Trạng thái sản phẩm sẽ chuyển sang "Đã bán"</p>
          <p>• Đơn hàng sẽ được lưu vào hệ thống</p>
        </div>
      </CardContent>
    </Card>
  );
}