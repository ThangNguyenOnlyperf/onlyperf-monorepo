'use client';

import { useState } from 'react';
import { Plus, PackagePlus, UserPlus } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import ProductLineItem from './ProductLineItem';
import ProviderSelect from './ProviderSelect';
import { ShipmentFormSchema, type ShipmentFormData } from './ShipmentSchema';
import type { Product } from '~/lib/schemas/productSchema';
import type { Provider } from '~/actions/providerActions';
import type { Color } from '~/lib/schemas/colorSchema';

interface NewShipmentFormProps {
  onSubmit: (data: ShipmentFormData) => Promise<void>;
  products?: Product[];
  providers?: Provider[];
  colors?: Color[];
  onCreateProduct?: () => void;
  onCreateProvider?: () => void;
}

export default function NewShipmentForm({ 
  onSubmit, 
  products = [], 
  providers = [],
  colors = [],
  onCreateProduct,
  onCreateProvider
}: NewShipmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<ShipmentFormData>({
    resolver: zodResolver(ShipmentFormSchema),
    defaultValues: {
      receiptNumber: '',
      receiptDate: new Date().toISOString().split('T')[0],
      supplierName: '',
      providerId: '',
      items: [
        {
          id: crypto.randomUUID(),
          brand: '',
          model: '',
          quantity: 1,
          isPackableProduct: false,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const handleSubmit = async (data: ShipmentFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    append({
      id: crypto.randomUUID(),
      brand: '',
      model: '',
      quantity: 1,
      isPackableProduct: false,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Header Information */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Thông tin phiếu nhập</h2>
            {onCreateProvider && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreateProvider}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Tạo nhà cung cấp mới
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="receiptNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Số phiếu nhập *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: PN-2024-001"
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Ngày nhập *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Nhà cung cấp *</FormLabel>
                  <FormControl>
                    <ProviderSelect
                      providers={providers}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Also set the supplierName for backward compatibility
                        const provider = providers.find(p => p.id === value);
                        if (provider) {
                          form.setValue('supplierName', provider.name);
                        }
                      }}
                      placeholder="Chọn nhà cung cấp"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Danh sách sản phẩm</h2>
            <div className="flex gap-2">
              {onCreateProduct && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCreateProduct}
                  className="gap-2 btn-secondary"
                >
                  <PackagePlus className="h-4 w-4" />
                  Tạo sản phẩm mới
                </Button>
              )}
            </div>
          </div>

          {/* Labels row */}
          {fields.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr_auto] gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sản phẩm
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Số lượng
              </label>
              <div className="w-[44px]"></div> {/* Spacer for delete button */}
            </div>
          )}

          <div className="space-y-3">
            {fields.map((item, index) => (
              <ProductLineItem
                key={item.id}
                index={index}
                onRemove={remove}
                products={products}
                colors={colors}
              />
            ))}
          </div>
          <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-2 btn-secondary"
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </Button>
          {form.formState.errors.items?.message && (
            <p className="text-sm text-red-500">
              {form.formState.errors.items.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end pr-6 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Tạo phiếu nhập và in QR'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
