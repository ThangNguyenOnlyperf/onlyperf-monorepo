'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import QRScanner from '~/components/scanner/QRScanner';
import PriceInputDialog from './PriceInputDialog';
import { validateAndFetchItem, updateProductPrice } from '~/actions/outboundActions';
import { toast } from 'sonner';
import type { CartItem, ScannedProduct } from './types';

interface OutboundScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: CartItem) => boolean;
  scannedItemIds: Set<string>;
}

export default function OutboundScanner({
  open,
  onOpenChange,
  onAddToCart,
  scannedItemIds
}: OutboundScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(null);
  const [showPriceDialog, setShowPriceDialog] = useState(false);

  const handleScan = async (data: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const result = await validateAndFetchItem(data);
      
      if (!result.success) {
        toast.error(result.message);
        setIsProcessing(false);
        return;
      }

      const item = result.data;
      
      if (!item) {
        toast.error('Không có dữ liệu sản phẩm');
        setIsProcessing(false);
        return;
      }
      
      if (scannedItemIds.has(item.shipmentItemId)) {
        toast.error('Sản phẩm đã được quét');
        setIsProcessing(false);
        return;
      }

      
      if (item.status !== 'received') {
        toast.error('Sản phẩm không khả dụng để bán');
        setIsProcessing(false);
        return;
      }

      
      setScannedProduct(item);
      setShowPriceDialog(true);
      setIsProcessing(false);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Lỗi khi quét mã QR');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriceConfirm = async (price: number, saveForFuture: boolean) => {
    if (!scannedProduct) return;

    try {
      if (saveForFuture) {
        const result = await updateProductPrice(scannedProduct.productId, price);
        if (!result.success) {
          toast.error('Không thể lưu giá cho sản phẩm');
        }
      }

      const cartItem: CartItem = {
        id: scannedProduct.shipmentItemId,
        productId: scannedProduct.productId,
        productName: scannedProduct.productName,
        brand: scannedProduct.brand,
        model: scannedProduct.model,
        qrCode: scannedProduct.qrCode,
        price: price,
        shipmentItemId: scannedProduct.shipmentItemId
      };

      const added = onAddToCart(cartItem);
      
      if (added) {
        toast.success(`Đã thêm ${scannedProduct.productName} với giá ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}`);
        setShowPriceDialog(false);
        setScannedProduct(null);
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error processing price:', error);
      toast.error('Lỗi khi xử lý giá sản phẩm');
    }
  };

  const handlePriceCancel = () => {
    setShowPriceDialog(false);
    setScannedProduct(null);
    toast.info('Đã hủy thêm sản phẩm');
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Quét mã QR sản phẩm</SheetTitle>
            <SheetDescription>
              Hướng camera vào mã QR trên sản phẩm để thêm vào giỏ hàng
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 h-[calc(100%-80px)]">
            <QRScanner
              onScan={handleScan}
              isOpen={open}
            />
          </div>
        </SheetContent>
      </Sheet>

      <PriceInputDialog
        open={showPriceDialog}
        onOpenChange={setShowPriceDialog}
        product={scannedProduct}
        onConfirm={handlePriceConfirm}
        onCancel={handlePriceCancel}
      />
    </>
  );
}