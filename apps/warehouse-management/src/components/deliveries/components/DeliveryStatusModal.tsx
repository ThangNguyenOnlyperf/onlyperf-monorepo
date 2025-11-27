'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { DeliveryWithOrder } from '../types';
import { updateDeliveryStatusSchema, type UpdateDeliveryStatusData } from '../deliverySchema';
import { updateDeliveryStatus } from '~/actions/deliveryActions';
import { FAILURE_CATEGORY_LABELS } from '../types';

interface DeliveryStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryWithOrder | null;
  onSuccess: (delivery: DeliveryWithOrder) => void;
}

const failureCategories = [
  { value: 'customer_unavailable', label: 'Khách hàng không có mặt', icon: Clock },
  { value: 'wrong_address', label: 'Sai địa chỉ giao hàng', icon: AlertTriangle },
  { value: 'damaged_package', label: 'Hàng bị hư hỏng', icon: XCircle },
  { value: 'refused_delivery', label: 'Khách hàng từ chối nhận', icon: XCircle },
];

export default function DeliveryStatusModal({
  open,
  onOpenChange,
  delivery,
  onSuccess,
}: DeliveryStatusModalProps) {
  const [isPending, startTransition] = useTransition();
  
  const [selectedStatus, setSelectedStatus] = useState<'delivered' | 'failed'>('delivered');
  const [selectedFailureCategory, setSelectedFailureCategory] = useState<string>('');
  
  const form = useForm<UpdateDeliveryStatusData>({
    resolver: zodResolver(updateDeliveryStatusSchema),
    defaultValues: {
      status: 'delivered',
      failureReason: '',
      notes: '',
    },
  });

  const onSubmit = (data: UpdateDeliveryStatusData) => {
    if (!delivery) return;

    const submitData: UpdateDeliveryStatusData = {
      ...data,
      status: selectedStatus,
      failureCategory: selectedStatus === 'failed' 
        ? selectedFailureCategory as 'customer_unavailable' | 'wrong_address' | 'damaged_package' | 'refused_delivery'
        : undefined,
    };

    startTransition(async () => {
      try {
        const result = await updateDeliveryStatus(delivery.id, submitData);
        if (result.success && result.data) {
          onSuccess(result.data);
          form.reset();
          setSelectedStatus('delivered');
          setSelectedFailureCategory('');
        } else {
          toast.error("Lỗi", {
            description: result.message,
          });
        }
      } catch (error) {
        toast.error("Lỗi", {
          description: "Không thể cập nhật trạng thái giao hàng",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        form.reset();
        setSelectedStatus('delivered');
        setSelectedFailureCategory('');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent 
        className="glass-effect card-shadow max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" 
        aria-labelledby="dialog-title" 
        aria-describedby="dialog-description"
      >
        <DialogTitle className='flex items-center gap-2'>
          <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className='text-center'>Cập nhật trạng thái giao hàng</span>
        </DialogTitle>
        <DialogHeader>
         
          <DialogDescription id="dialog-description">
            Cập nhật trạng thái giao hàng cho đơn #{delivery?.order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        {delivery && (
          <div className="flex flex-col overflow-hidden">
            {/* Order Information - Fixed Header */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 flex-shrink-0" role="region" aria-label="Thông tin đơn hàng">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium">Khách hàng:</dt>
                  <dd className="mt-1">{delivery.order.customer.name}</dd>
                </div>
                <div>
                  <dt className="font-medium">Số điện thoại:</dt>
                  <dd className="mt-1">{delivery.order.customer.phone}</dd>
                </div>
                <div>
                  <dt className="font-medium">Shipper:</dt>
                  <dd className="mt-1">{delivery.shipperName}</dd>
                </div>
                <div>
                  <dt className="font-medium">Mã vận đơn:</dt>
                  <dd className="mt-1">{delivery.trackingNumber || 'Chưa có'}</dd>
                </div>
              </dl>
            </div>

            {/* Scrollable Form Content */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1 px-1 space-y-6 max-h-[calc(90vh-320px)] md:max-h-[calc(85vh-300px)]">
                {/* Status Selection */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-gray-900">Trạng thái giao hàng <span className="text-red-500 text-sm" aria-label="Bắt buộc">*</span></h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('delivered')}
                      className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all bg-white ${
                        selectedStatus === 'delivered' 
                          ? 'border-emerald-500 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                      aria-pressed={selectedStatus === 'delivered'}
                      aria-describedby="delivered-desc"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                        selectedStatus === 'delivered' 
                          ? 'bg-emerald-500' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <CheckCircle className={`h-7 w-7 ${
                          selectedStatus === 'delivered' ? 'text-white' : 'text-gray-400'
                        }`} aria-hidden="true" />
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold text-sm mb-1 ${
                          selectedStatus === 'delivered' ? 'text-gray-900' : 'text-gray-700'
                        }`}>Giao thành công</div>
                        <p id="delivered-desc" className="text-xs text-gray-500">
                          Khách hàng đã nhận
                        </p>
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setSelectedStatus('failed')}
                      className={`relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all bg-white ${
                        selectedStatus === 'failed' 
                          ? 'border-red-500 shadow-sm' 
                          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                      aria-pressed={selectedStatus === 'failed'}
                      aria-describedby="failed-desc"
                    >
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                        selectedStatus === 'failed' 
                          ? 'bg-red-500' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <XCircle className={`h-7 w-7 ${
                          selectedStatus === 'failed' ? 'text-white' : 'text-gray-400'
                        }`} aria-hidden="true" />
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold text-sm mb-1 ${
                          selectedStatus === 'failed' ? 'text-gray-900' : 'text-gray-700'
                        }`}>Giao thất bại</div>
                        <p id="failed-desc" className="text-xs text-gray-500">
                          Không thể giao hàng
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Failure Category (only show when failed is selected) */}
                {selectedStatus === 'failed' && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-gray-900">Lý do giao thất bại <span className="text-red-500 text-sm" aria-label="Bắt buộc">*</span></h3>
                    <div className="space-y-2">
                      {failureCategories.map((category) => {
                        const Icon = category.icon;
                        return (
                          <button
                            key={category.value}
                            type="button"
                            onClick={() => setSelectedFailureCategory(category.value)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all bg-white ${
                              selectedFailureCategory === category.value
                                ? 'border-primary shadow-sm'
                                : 'border-gray-100 hover:border-gray-200'
                            }`}
                            aria-pressed={selectedFailureCategory === category.value}
                            aria-describedby={`${category.value}-desc`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                selectedFailureCategory === category.value 
                                  ? 'bg-primary/10' 
                                  : 'bg-gray-50'
                              }`}>
                                <Icon className={`h-5 w-5 ${
                                  selectedFailureCategory === category.value ? 'text-primary' : 'text-gray-400'
                                }`} aria-hidden="true" />
                              </div>
                              <span id={`${category.value}-desc`} className={`text-sm text-left ${
                                selectedFailureCategory === category.value ? 'text-gray-900 font-medium' : 'text-gray-700'
                              }`}>{category.label}</span>
                            </div>
                            {selectedFailureCategory === category.value && (
                              <CheckCircle className="h-5 w-5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedStatus === 'failed' && !selectedFailureCategory && (
                      <p className="text-sm text-red-600 mt-2" role="alert">Vui lòng chọn lý do giao thất bại</p>
                    )}
                  </div>
                )}

                {/* Failure Reason (only show when failed is selected) */}
                {selectedStatus === 'failed' && (
                  <FormField
                    control={form.control}
                    name="failureReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Chi tiết lý do thất bại</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Mô tả chi tiết về lý do giao hàng thất bại..."
                            className="min-h-20 border border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none rounded-lg"
                          />
                        </FormControl>
                        <FormMessage role="alert" />
                      </FormItem>
                    )}
                  />
                )}

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Ghi chú thêm</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Ghi chú thêm về quá trình giao hàng..."
                            className="min-h-16 border border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none rounded-lg"
                          />
                        </FormControl>
                        <FormMessage role="alert" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons - Fixed Footer */}
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t flex-shrink-0">
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
                    disabled={isPending || (selectedStatus === 'failed' && !selectedFailureCategory)}
                    className="btn-primary"
                  >
                    {isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật trạng thái'
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