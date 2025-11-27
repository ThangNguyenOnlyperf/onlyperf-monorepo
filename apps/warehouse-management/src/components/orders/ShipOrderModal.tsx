'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { markOrderAsShipped } from '~/actions/deliveryActions';
import type { OrderDetail } from '~/actions/orderActions';

const ShipOrderSchema = z.object({
  shipperName: z.string().min(1, 'Vui lòng nhập tên shipper'),
  shipperPhone: z.string().optional(),
  trackingNumber: z.string().optional(),
});

type ShipOrderFormData = z.infer<typeof ShipOrderSchema>;

interface ShipOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderDetail | null;
  onSuccess: () => void;
}

export default function ShipOrderModal({
  open,
  onOpenChange,
  order,
  onSuccess,
}: ShipOrderModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<ShipOrderFormData>({
    resolver: zodResolver(ShipOrderSchema),
    defaultValues: {
      shipperName: '',
      shipperPhone: '',
      trackingNumber: '',
    },
  });

  const onSubmit = (data: ShipOrderFormData) => {
    if (!order) return;

    startTransition(async () => {
      try {
        const result = await markOrderAsShipped(order.id, {
          shipperName: data.shipperName,
          shipperPhone: data.shipperPhone ?? undefined,
          trackingNumber: data.trackingNumber ?? undefined,
        });
        
        if (result.success) {
          toast.success('Thành công', {
            description: result.message,
          });
          form.reset();
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error('Lỗi', {
            description: result.message,
          });
        }
      } catch {
        toast.error('Lỗi', {
          description: 'Không thể giao hàng cho đơn này',
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        form.reset();
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent 
        className="glass-effect card-shadow max-w-md"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="dialog-title" className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Giao hàng đơn #{order?.orderNumber}
          </DialogTitle>
          <DialogDescription id="dialog-description">
            Nhập thông tin shipper để chuyển đơn hàng sang trạng thái giao hàng
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-4">
            {/* Order Info Summary */}
            <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Khách hàng:</span>
                <span className="font-medium">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số điện thoại:</span>
                <span className="font-medium">{order.customer.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Địa chỉ:</span>
                <span className="font-medium">{order.customer.address ?? 'Chưa có'}</span>
              </div>
            </div>

            {/* Ship Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shipperName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">
                        Tên shipper <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập tên người giao hàng"
                          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shipperPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Số điện thoại shipper</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập số điện thoại (tùy chọn)"
                          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Mã vận đơn</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nhập mã vận đơn (tùy chọn)"
                          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                    className="btn-secondary"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary"
                  >
                    {isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4 mr-2" />
                        Giao hàng
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}