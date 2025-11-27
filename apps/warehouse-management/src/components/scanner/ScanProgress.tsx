'use client';

import { Progress } from '~/components/ui/progress';
import { CheckCircle, Package } from 'lucide-react';

interface ScanProgressProps {
  totalItems: number;
  scannedItems: number;
  shipmentNumber?: string;
}

export default function ScanProgress({ 
  totalItems, 
  scannedItems,
  shipmentNumber 
}: ScanProgressProps) {
  const percentage = totalItems > 0 ? (scannedItems / totalItems) * 100 : 0;
  const isComplete = scannedItems === totalItems;

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Package className="h-5 w-5 text-primary" />
          )}
          <span className="font-medium">
            {scannedItems}/{totalItems} sản phẩm
          </span>
        </div>
        {shipmentNumber && (
          <span className="text-sm text-muted-foreground">
            {shipmentNumber}
          </span>
        )}
      </div>
      
      <Progress value={percentage} className="h-3" />
      
      {isComplete && (
        <p className="text-sm text-green-600 text-center font-medium">
          ✓ Đã quét xong tất cả sản phẩm
        </p>
      )}
    </div>
  );
}