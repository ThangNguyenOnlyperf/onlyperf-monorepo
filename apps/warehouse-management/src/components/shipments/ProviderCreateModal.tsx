'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import ProviderForm from './ProviderForm';
import { createProviderAction, type CreateProviderInput, type Provider } from '~/actions/providerActions';
import { toast } from 'sonner';

interface ProviderCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProviderCreated?: (provider: Provider) => void;
}

export default function ProviderCreateModal({
  open,
  onOpenChange,
  onProviderCreated,
}: ProviderCreateModalProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (data: CreateProviderInput) => {
    setIsPending(true);
    try {
      const result = await createProviderAction(data);
      
      if (result.success && result.data) {
        toast.success(result.message || 'Nhà cung cấp đã được tạo thành công');
        onProviderCreated?.(result.data);
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Không thể tạo nhà cung cấp');
      }
    } catch (error) {
      console.error('Error creating provider:', error);
      toast.error('Đã xảy ra lỗi khi tạo nhà cung cấp');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm nhà cung cấp mới</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ProviderForm
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}