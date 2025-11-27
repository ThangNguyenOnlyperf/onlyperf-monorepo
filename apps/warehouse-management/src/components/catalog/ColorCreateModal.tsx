'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import ColorForm from './ColorForm';

interface ColorCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColorCreated?: (color: { id: string; name: string; hex: string }) => void;
}

export default function ColorCreateModal({ open, onOpenChange, onColorCreated }: ColorCreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm màu mới</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ColorForm
            onCreated={(color) => {
              onColorCreated?.(color);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
