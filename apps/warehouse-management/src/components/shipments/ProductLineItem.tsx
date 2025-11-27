'use client';

import { Trash2, Layers, Package } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import ProductSelect from './ProductSelect';
import type { Color } from '~/lib/schemas/colorSchema';
import type { ShipmentFormData } from './ShipmentSchema';
import type { Product } from '~/lib/schemas/productSchema';
import { cn } from '~/lib/utils';
import { useEffect, useState } from 'react';
import { isPackableType } from '~/lib/constants/product-types';

interface ProductLineItemProps {
  index: number;
  onRemove: (index: number) => void;
  products?: Product[];
  colors?: Color[];
}

const PACK_SIZE_OPTIONS = [3, 10];

export default function ProductLineItem({
  index,
  onRemove,
  products = [],
  colors = [],
}: ProductLineItemProps) {
  const { control, setValue, formState: { errors } } = useFormContext<ShipmentFormData>();
  const [useCustomPackSize, setUseCustomPackSize] = useState(false);

  // Watch the selected product ID and pack config values
  const selectedProductId = useWatch({ control, name: `items.${index}.brand` });
  const totalUnits = useWatch({ control, name: `items.${index}.totalUnits` });
  const packSize = useWatch({ control, name: `items.${index}.packSize` });

  // Find the selected product to check if it's packable
  const selectedProduct = products.find(p => p.id === selectedProductId);
  const isPackable = isPackableType(selectedProduct?.productType) && !selectedProduct?.isPackProduct;

  // Update isPackableProduct when product selection changes
  useEffect(() => {
    if (selectedProduct) {
      setValue(`items.${index}.isPackableProduct`, isPackable);
      // Reset pack config when switching to non-packable product
      if (!isPackable) {
        setValue(`items.${index}.totalUnits`, undefined);
        setValue(`items.${index}.packSize`, undefined);
      }
    }
  }, [selectedProductId, isPackable, setValue, index, selectedProduct]);

  // Calculate number of packs
  const calculatePacks = () => {
    if (totalUnits && packSize && packSize > 0) {
      const packs = totalUnits / packSize;
      const isDivisible = totalUnits % packSize === 0;
      return { packs: Math.floor(packs), isDivisible, remainder: totalUnits % packSize };
    }
    return null;
  };

  const packCalc = calculatePacks();

  return (
    <div className="space-y-3 py-4 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
      {/* Main row: Product Select + Quantity/Pack Config + Remove */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr_auto] gap-3">
        <div className="space-y-1">
          <Controller
            control={control}
            name={`items.${index}.brand`}
            render={({ field }) => (
              <ProductSelect
                products={products}
                value={field.value}
                onValueChange={(productId) => {
                  const product = products.find(p => p.id === productId);
                  if (product) {
                    field.onChange(product.id);
                    setValue(`items.${index}.model`, product.model);
                  }
                }}
                placeholder="Chọn sản phẩm"
              />
            )}
          />
          {selectedProduct && (
            <div className="flex items-center gap-2 mt-1">
              {isPackable ? (
                <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
                  <Layers className="h-3 w-3 mr-1" />
                  Đóng gói
                </Badge>
              ) : selectedProduct.isPackProduct ? (
                <Badge variant="secondary" className="text-xs">
                  <Package className="h-3 w-3 mr-1" />
                  {selectedProduct.packSize}-Pack
                </Badge>
              ) : null}
            </div>
          )}
          {errors.items?.[index]?.brand && (
            <p className="text-xs text-red-500">{errors.items[index]?.brand?.message}</p>
          )}
        </div>

        {/* Quantity Input (for non-packable) or placeholder for packable */}
        {!isPackable ? (
          <div className="space-y-1">
            <Controller
              control={control}
              name={`items.${index}.quantity`}
              render={({ field }) => (
                <Input
                  type="number"
                  min="1"
                  value={field.value}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  placeholder="Số lượng"
                  className="min-h-[44px]"
                />
              )}
            />
            {errors.items?.[index]?.quantity && (
              <p className="text-xs text-red-500">{errors.items[index]?.quantity?.message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            Cấu hình bên dưới
          </div>
        )}

        {/* Remove Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="min-h-[44px] min-w-[44px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Pack Configuration Panel (only for packable products) */}
      {isPackable && (
        <div className="p-3 bg-cyan-50 dark:bg-cyan-950 rounded-lg border border-cyan-200 dark:border-cyan-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Units */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tổng số bóng *</Label>
              <Controller
                control={control}
                name={`items.${index}.totalUnits`}
                render={({ field }) => (
                  <Input
                    type="number"
                    min="1"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      field.onChange(isNaN(val) ? undefined : val);
                      // Also set quantity to the calculated packs for form validation
                      if (packSize && !isNaN(val)) {
                        setValue(`items.${index}.quantity`, Math.floor(val / packSize) || 1);
                      }
                    }}
                    placeholder="VD: 10000"
                    className="bg-white dark:bg-gray-900"
                  />
                )}
              />
              {errors.items?.[index]?.totalUnits && (
                <p className="text-xs text-red-500">{(errors.items[index] as any)?.totalUnits?.message}</p>
              )}
            </div>

            {/* Pack Size */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Số bóng/gói *</Label>
              {!useCustomPackSize ? (
                <Controller
                  control={control}
                  name={`items.${index}.packSize`}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ''}
                      onValueChange={(val) => {
                        if (val === 'custom') {
                          setUseCustomPackSize(true);
                          field.onChange(undefined);
                        } else {
                          const numVal = parseInt(val);
                          field.onChange(numVal);
                          // Update quantity based on new pack size
                          if (totalUnits) {
                            setValue(`items.${index}.quantity`, Math.floor(totalUnits / numVal) || 1);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-900">
                        <SelectValue placeholder="Chọn kích thước" />
                      </SelectTrigger>
                      <SelectContent>
                        {PACK_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} bóng/gói
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Khác...</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name={`items.${index}.packSize`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="1"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          field.onChange(isNaN(val) ? undefined : val);
                          // Update quantity based on new pack size
                          if (totalUnits && !isNaN(val)) {
                            setValue(`items.${index}.quantity`, Math.floor(totalUnits / val) || 1);
                          }
                        }}
                        placeholder="Nhập số"
                        className="bg-white dark:bg-gray-900"
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomPackSize(false)}
                  >
                    Gợi ý
                  </Button>
                </div>
              )}
            </div>

            {/* Calculated Packs */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Số gói tạo ra</Label>
              <div className={cn(
                "h-10 flex items-center px-3 rounded-md border bg-white dark:bg-gray-900",
                packCalc?.isDivisible === false && "border-red-300 bg-red-50"
              )}>
                {packCalc ? (
                  packCalc.isDivisible ? (
                    <span className="font-semibold text-green-600">{packCalc.packs.toLocaleString()} gói</span>
                  ) : (
                    <span className="text-red-500 text-sm">
                      Không chia hết! (dư {packCalc.remainder})
                    </span>
                  )
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Info text */}
          {packCalc?.isDivisible && (
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
              Sẽ tạo {packCalc.packs.toLocaleString()} mã QR (mỗi gói 1 mã)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
