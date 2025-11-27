'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Checkbox } from '~/components/ui/checkbox';
import { Package, DollarSign, Tag } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import type { ScannedProduct } from './types';

interface PriceInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ScannedProduct | null;
  onConfirm: (price: number, saveForFuture: boolean) => void;
  onCancel: () => void;
}

export default function PriceInputDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
  onCancel
}: PriceInputDialogProps) {

  const [price, setPrice] = useState<string>("");

  useEffect(() => {
    if (product && product.price > 0) {
      setPrice(product.price.toString());
      // detect when user already have a price for this item
      return
    } else {
      setPrice('');
      return
    }
  }, [product]);

  const [saveForFuture, setSaveForFuture] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setPrice(value);
  };

  const handleConfirm = () => {
    const priceValue = parseInt(price, 10);
    if (priceValue > 0) {
      setIsSubmitting(true);
      onConfirm(priceValue, saveForFuture);
      setPrice('');
      setSaveForFuture(false);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPrice('');
    setSaveForFuture(false);
    onCancel();
  };

  if (!product) return null;

  const hasExistingPrice = product.price > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Nhập giá sản phẩm
          </DialogTitle>
          <DialogDescription>
            Vui lòng nhập giá bán cho sản phẩm này
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Info */}
          <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold">{product.productName}</h4>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {product.brand}
                  </span>
                  <span>{product.model}</span>
                </div>
                <div className="pt-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {product.qrCode}
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Current Price (if exists) */}
          {hasExistingPrice && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Giá hiện tại: <strong>{formatCurrency(product.price)}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Bạn có thể giữ nguyên hoặc cập nhật giá mới
              </p>
            </div>
          )}

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="font-medium">
              Giá bán (VNĐ) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="text"
                value={price}
                onChange={handlePriceChange}
                placeholder={hasExistingPrice ? `Giá ở cập nhật cuối : ${formatCurrency(product.price)}` : "Nhập giá sản phẩm"}
                className="pl-10 h-11 text-lg font-semibold border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            {price && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(parseInt(price, 10) || 0)}
              </p>
            )}
          </div>

          {/* Save for Future Checkbox */}
          <div className="flex items-center space-x-2 rounded-lg bg-muted/50 p-3">
            <Checkbox
              id="save-price"
              checked={saveForFuture}
              onCheckedChange={(checked) => setSaveForFuture(checked as boolean)}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="save-price"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Lưu giá này cho các lần quét sau
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!price || parseInt(price, 10) <= 0 || isSubmitting}
            className="btn-primary"
          >
            {hasExistingPrice && !price ? 'Giữ giá cũ' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}