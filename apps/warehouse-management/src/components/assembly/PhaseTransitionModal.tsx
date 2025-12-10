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
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import type { AssemblyBundleItem } from '~/actions/assemblyActions';

interface PhaseTransitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItem: AssemblyBundleItem | null;
  nextItem: AssemblyBundleItem | null;
  onConfirm: () => void;
  isPending: boolean;
}

export default function PhaseTransitionModal({
  open,
  onOpenChange,
  currentItem,
  nextItem,
  onConfirm,
  isPending,
}: PhaseTransitionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Hoàn thành pha!
          </DialogTitle>
          <DialogDescription>
            Bạn đã quét xong tất cả sản phẩm của pha này.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-center gap-4">
            {/* Current Phase */}
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex-1">
              <div className="text-sm text-emerald-600 mb-1">Vừa hoàn thành</div>
              <div className="font-bold text-emerald-800">
                {currentItem?.product?.name ?? '-'}
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-2">
                {currentItem?.scannedCount}/{currentItem?.expectedCount}
              </div>
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* Next Phase */}
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200 flex-1">
              <div className="text-sm text-blue-600 mb-1">Pha tiếp theo</div>
              <div className="font-bold text-blue-800">
                {nextItem?.product?.name ?? '-'}
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-2">
                0/{nextItem?.expectedCount ?? 0}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đợi chút
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-gradient-to-r from-blue-500 to-blue-600"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Tôi sẵn sàng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
