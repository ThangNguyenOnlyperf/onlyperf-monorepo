'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { toast } from 'sonner';
import ProviderForm from '~/components/shipments/ProviderForm';
import { createProviderAction } from '~/actions/providerActions';
import type { Provider, CreateProviderInput } from '~/actions/providerActions';

interface ProviderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProviderCreated: (provider: Provider) => void;
  defaultType?: 'supplier' | 'retailer' | 'seller';
}

export default function ProviderModal({ 
  open, 
  onOpenChange, 
  onProviderCreated,
  defaultType = 'retailer'
}: ProviderModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (data: CreateProviderInput) => {
    startTransition(async () => {
      const result = await createProviderAction(data);
      
      if (result.success && result.data) {
        toast.success(result.message);
        onProviderCreated(result.data);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Không thể tạo nhà cung cấp');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
          <DialogDescription>
            Tạo thông tin nhà cung cấp/đại lý/người bán cho giao dịch B2B
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ProviderForm
            defaultValues={{ type: defaultType }}
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}