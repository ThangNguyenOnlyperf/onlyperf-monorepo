'use client';

import { toast } from 'sonner';
import { ShoppingCart, PackageCheck } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface OrderInfo {
  orderId: string;
  orderNumber: string;
  shopifyOrderNumber: string | null;
}

export function showNewOrderNotification(
  orders: OrderInfo[],
  onNavigate?: () => void
) {
  // Show one notification for all new orders
  const orderCount = orders.length;
  const orderText = orderCount === 1 ? 'đơn hàng mới' : `${orderCount} đơn hàng mới`;

  toast.custom(
    (t) => (
      <div
        className="min-w-[400px] max-w-2xl mx-auto p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-2 border-blue-500/20 rounded-xl shadow-xl backdrop-blur-sm animate-in slide-in-from-top duration-300"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-blue-500 rounded-full">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-blue-700 whitespace-nowrap">
                Đơn hàng Shopify mới!
              </h3>
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                {orderCount}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Có {orderText} cần xử lý
            </p>
            <div className="space-y-1.5 mb-3">
              {orders.slice(0, 3).map((order) => (
                <div
                  key={order.orderId}
                  className="text-xs px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md font-medium inline-block w-full"
                >
                  {order.shopifyOrderNumber ?? order.orderNumber}
                </div>
              ))}
              {orders.length > 3 && (
                <div className="text-xs px-2 py-1.5 bg-muted border rounded-md inline-block">
                  +{orders.length - 3} đơn khác
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => {
                  toast.dismiss(t);
                  if (onNavigate) {
                    onNavigate();
                  } else {
                    // Fallback to hard navigation if no callback provided
                    window.location.href = '/fulfillment';
                  }
                }}
              >
                <PackageCheck className="mr-1 h-4 w-4" />
                Xử lý ngay
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.dismiss(t)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 10000, // 10 seconds
      position: 'top-center',
    }
  );
}

// Helper to show notification for a single order
export function showSingleOrderNotification(order: OrderInfo) {
  showNewOrderNotification([order]);
}
