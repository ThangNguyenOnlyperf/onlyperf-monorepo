'use client';

import { useState, useTransition, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Input } from '~/components/ui/input';
import { Package, RotateCcw, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { DeliveryWithOrder } from '../types';
import { failureResolutionSchema, type FailureResolutionData } from '../deliverySchema';
import { createFailureResolution } from '~/actions/deliveryActions';
import { FAILURE_CATEGORY_LABELS } from '../types';

interface FailureResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DeliveryWithOrder | null;
  onSuccess: (delivery: DeliveryWithOrder) => void;
}

const resolutionOptions = [
  {
    value: 're_import',
    label: 'Nhập lại kho',
    description: 'Đưa hàng về kho và cập nhật tồn kho',
    icon: Package,
  },
  {
    value: 'return_to_supplier',
    label: 'Trả về nhà cung cấp',
    description: 'Trả hàng về nhà cung cấp theo quy trình',
    icon: Truck,
  },
  {
    value: 'retry_delivery',
    label: 'Giao lại',
    description: 'Sắp xếp giao hàng lại cho khách hàng',
    icon: RotateCcw,
  },
];

export default function FailureResolutionModal({
  open,
  onOpenChange,
  delivery,
  onSuccess,
}: FailureResolutionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [storages, setStorages] = useState<Array<{ id: string; name: string; location: string }>>([]);
  const [selectedResolution, setSelectedResolution] = useState<string>('re_import');
  
  const form = useForm<FailureResolutionData>({
    resolver: zodResolver(failureResolutionSchema),
    defaultValues: {
      resolutionType: 're_import',
      notes: '',
    },
  });

  // TODO(human): Implement the function to fetch available storages from the database
  // This function should query the storages table and return an array of storage options
  // Consider filtering by available capacity if needed

  const onSubmit = (data: FailureResolutionData) => {
    if (!delivery) return;

    const submitData = {
      ...data,
      resolutionType: selectedResolution as 're_import' | 'return_to_supplier' | 'retry_delivery',
    };

    startTransition(async () => {
      try {
        const result = await createFailureResolution(delivery.id, submitData);
        
        if (result.success && result.data) {
          onSuccess(result.data);
          form.reset();
          setSelectedResolution('re_import');
        } else {
          toast.error("Lỗi", {
            description: result.message,
          });
        }
      } catch (error) {
        toast.error("Lỗi", {
          description: "Không thể tạo quy trình xử lý",
        });
      }
    });
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        form.reset();
        setSelectedResolution('re_import');
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent 
        className="glass-effect card-shadow max-w-2xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="dialog-title" className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />
            Xử lý giao hàng thất bại
          </DialogTitle>
          <DialogDescription id="dialog-description">
            Chọn cách xử lý cho đơn hàng giao thất bại #{delivery?.order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        {delivery && (
          <div className="flex flex-col overflow-hidden">
            {/* Failure Information - Fixed Header */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex-shrink-0" role="region" aria-label="Thông tin lỗi">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
                <span className="font-medium text-red-800">Thông tin giao thất bại</span>
              </div>
              <div className="text-sm space-y-1 mt-2">
                {delivery.failureCategory && (
                  <p><span className="font-medium">Phân loại:</span> {FAILURE_CATEGORY_LABELS[delivery.failureCategory]}</p>
                )}
                <p><span className="font-medium">Lý do:</span> {delivery.failureReason || 'Không có thông tin'}</p>
                {delivery.notes && <p><span className="font-medium">Ghi chú:</span> {delivery.notes}</p>}
              </div>
            </div>

            {/* Scrollable Form Content */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
                <div className="overflow-y-auto flex-1 px-1 space-y-6 max-h-[calc(90vh-320px)] md:max-h-[calc(85vh-300px)]">
                {/* Resolution Type Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-900">Chọn cách xử lý</label>
                  <div className="grid grid-cols-1 gap-3">
                    {resolutionOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedResolution(option.value)}
                          className={`relative flex items-center p-4 rounded-xl border transition-all ${
                            selectedResolution === option.value
                              ? 'border-gray-900 bg-gray-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                          aria-pressed={selectedResolution === option.value}
                          aria-describedby={`${option.value}-desc`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-3 rounded-lg ${
                              selectedResolution === option.value ? 'bg-gray-100' : 'bg-gray-50'
                            }`}>
                              <Icon className={`h-5 w-5 ${
                                selectedResolution === option.value ? 'text-gray-700' : 'text-gray-400'
                              }`} aria-hidden="true" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium text-sm ${
                                selectedResolution === option.value ? 'text-gray-900' : 'text-gray-700'
                              }`}>{option.label}</div>
                              <div id={`${option.value}-desc`} className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                            </div>
                          </div>
                          {selectedResolution === option.value && (
                            <CheckCircle className="h-4 w-4 text-gray-900 absolute right-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Storage (for re-import) */}
                {selectedResolution === 're_import' && storages.length > 0 && (
                  <FormField
                    control={form.control}
                    name="targetStorageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Chọn kho lưu trữ</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20">
                              <SelectValue placeholder="Chọn kho để nhập lại hàng" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {storages.map((storage) => (
                              <SelectItem key={storage.id} value={storage.id}>
                                {storage.name} - {storage.location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Return Reason (for supplier returns) */}
                {selectedResolution === 'return_to_supplier' && (
                  <FormField
                    control={form.control}
                    name="supplierReturnReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Lý do trả hàng</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Nhập lý do trả hàng về nhà cung cấp..."
                            className="min-h-20 border border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Scheduled Date (for retry delivery) */}
                {selectedResolution === 'retry_delivery' && (
                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Ngày dự kiến giao lại</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="h-10 border border-gray-200 hover:border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg transition-all"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
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
                      <FormLabel className="font-medium">Ghi chú xử lý</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Ghi chú về quy trình xử lý..."
                          className="min-h-20 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
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
                    disabled={isPending}
                    className="btn-primary"
                  >
                    {isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Đang tạo quy trình...
                      </>
                    ) : (
                      'Tạo quy trình xử lý'
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