'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { PartyPopper, Loader2, AlertTriangle } from 'lucide-react';
import type { AssemblyBundleItem } from '~/actions/assemblyActions';

interface CountVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AssemblyBundleItem[];
  onConfirm: () => void;
  isPending: boolean;
}

export default function CountVerificationModal({
  open,
  onOpenChange,
  items,
  onConfirm,
  isPending,
}: CountVerificationModalProps) {
  const totalScanned = items.reduce((sum, item) => sum + item.scannedCount, 0);
  const totalExpected = items.reduce((sum, item) => sum + item.expectedCount, 0);
  const allComplete = items.every(item => item.scannedCount >= item.expectedCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-amber-500" />
            Xác nhận hoàn thành
          </DialogTitle>
          <DialogDescription>
            Vui lòng kiểm tra số lượng trước khi hoàn thành lắp ráp.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Summary */}
          <div className="text-center p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-2">Tổng số sản phẩm đã quét</div>
            <div className="text-4xl font-bold text-primary">
              {totalScanned}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              / {totalExpected} mục tiêu
            </div>
          </div>

          {/* Item Breakdown */}
          <div className="space-y-2">
            {items.map((item) => {
              const isComplete = item.scannedCount >= item.expectedCount;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <span className="font-medium">
                    {item.product?.name ?? '-'}
                  </span>
                  <span className={`font-bold ${isComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {item.scannedCount}/{item.expectedCount}
                  </span>
                </div>
              );
            })}
          </div>

          {!allComplete && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                Một số sản phẩm chưa đủ số lượng. Vui lòng kiểm tra lại.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Báo lỗi
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending || !allComplete}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Đúng, hoàn thành
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
