'use client';

import { useTransition, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import { createProductAction } from '~/actions/productActions';
import { ProductSchema, type ProductFormData, type Product } from '~/lib/schemas/productSchema';
import type { Brand } from '~/lib/schemas/brandSchema';
import BrandCombobox from './BrandCombobox';
import type { Color } from '~/lib/schemas/colorSchema';
import ColorCombobox from './ColorCombobox';
import ColorCreateModal from './ColorCreateModal';
import { Plus, Package, Layers, Box } from 'lucide-react';
import {
  PRODUCT_TYPE_CONFIGS,
  DEFAULT_PRODUCT_TYPE,
  showsHandleFields,
  type ProductTypeValue,
} from '~/lib/constants/product-types';
import { cn } from '~/lib/utils';

interface ProductCreateFormProps {
  brands: Brand[];
  colors?: Color[];
  onSuccess?: (product?: Product) => void;
  isPending?: boolean;
}

export default function ProductCreateForm({ 
  brands, 
  colors = [],
  onSuccess,
  isPending: externalPending = false
}: ProductCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [colorsList, setColorsList] = useState(colors);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      brandId: '',
      model: '',
      description: '',
      category: '',
      colorId: '',
      weight: '',
      size: '',
      thickness: '',
      material: '',
      handleLength: '',
      handleCircumference: '',
      productType: DEFAULT_PRODUCT_TYPE,
      isPackProduct: false,
      packSize: null,
      baseProductId: null,
    },
  });

  const productType = form.watch('productType');

  const onSubmit = (data: ProductFormData) => {
    startTransition(async () => {
      const result = await createProductAction(data);
      
      if (result.success) {
        toast.success(result.message || 'Tạo sản phẩm thành công');
        form.reset();
        // Pass the created product data to the success callback
        onSuccess?.(result.data);
      } else {
        toast.error(result.message || 'Không thể tạo sản phẩm');
      }
    });
  };

  const isLoading = isPending || externalPending;

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Product Type Selector */}
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => {
            const selectedConfig = PRODUCT_TYPE_CONFIGS[field.value as ProductTypeValue] ?? PRODUCT_TYPE_CONFIGS.general;
            const IconMap = { Box, Package, Layers } as const;

            return (
              <FormItem>
                <FormLabel className="font-medium">Loại sản phẩm</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.values(PRODUCT_TYPE_CONFIGS).map((config) => {
                      const Icon = IconMap[config.icon];
                      const isSelected = field.value === config.value;
                      const colorClasses: Record<string, string> = {
                        slate: 'bg-gradient-to-r from-slate-500 to-slate-600',
                        primary: 'bg-gradient-to-r from-primary to-primary/90',
                        cyan: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
                      };

                      return (
                        <Button
                          key={config.value}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => field.onChange(config.value)}
                          disabled={isLoading}
                          className={cn(
                            "flex-1 gap-2 h-auto py-3 flex-col",
                            isSelected && colorClasses[config.colorClass]
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{config.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  {selectedConfig.description}
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Thương hiệu *</FormLabel>
                <FormControl>
                  <BrandCombobox
                    brands={brands}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Model *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nhập model sản phẩm"
                    disabled={isLoading}
                    className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Danh mục</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Nhập danh mục sản phẩm (tùy chọn)"
                  disabled={isLoading}
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Mô tả</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Nhập mô tả sản phẩm (tùy chọn)"
                  disabled={isLoading}
                  className="min-h-[100px] border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Product Specifications Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Thông số kỹ thuật</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField
              control={form.control}
              name="colorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium flex items-center justify-between">
                    <span>Màu sắc *</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setIsColorModalOpen(true)}
                      disabled={isLoading}
                      className="h-8 w-8"
                      title="Thêm màu mới"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </FormLabel>
                  <FormControl>
                    <ColorCombobox
                      colors={colorsList}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      onCreateRequest={(prefill) => setIsColorModalOpen(true)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Trọng lượng</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: 100g, 1.5kg..."
                      disabled={isLoading}
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Kích thước</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: 30x20x10 cm..."
                      disabled={isLoading}
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thickness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Độ dày</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: 5mm, 2cm..."
                      disabled={isLoading}
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Chất liệu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="VD: Nhựa, Kim loại, Gỗ..."
                      disabled={isLoading}
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paddle-specific fields - only show for product types with handle specs */}
            {showsHandleFields(productType) && (
              <>
                <FormField
                  control={form.control}
                  name="handleLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Chiều dài cán</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="VD: 15cm, 30cm..."
                          disabled={isLoading}
                          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handleCircumference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium">Chu vi cán</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="VD: 10cm, 12cm..."
                          disabled={isLoading}
                          className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-primary to-primary/90 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] button-shine"
          >
            {isLoading ? 'Đang tạo...' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </form>
    </Form>
    <ColorCreateModal
      open={isColorModalOpen}
      onOpenChange={setIsColorModalOpen}
      onColorCreated={(color) => {
        const now = new Date();
        setColorsList((prev) => [
          ...prev,
          { id: color.id, name: color.name, hex: color.hex, createdAt: now, updatedAt: now } as Color,
        ]);
        form.setValue('colorId', color.id, { shouldValidate: true, shouldDirty: true });
      }}
    />
    </>
  );
}
