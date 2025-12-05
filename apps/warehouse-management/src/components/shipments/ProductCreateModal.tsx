'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import ProductCreateForm from '../catalog/ProductCreateForm';
import type { Brand } from '~/lib/schemas/brandSchema';
import type { Product } from '~/lib/schemas/productSchema';
import type { Color } from '~/lib/schemas/colorSchema';

interface ProductCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: Brand[];
  colors?: Color[];
  onProductCreated: (product: Product) => void;
}

export default function ProductCreateModal({
  open,
  onOpenChange,
  brands,
  colors = [],
  onProductCreated,
}: ProductCreateModalProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSuccess = (createdProduct?: Product) => {
    // Call the parent's callback with the created product
    if (createdProduct) {
      onProductCreated(createdProduct);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm mới</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ProductCreateForm
            brands={brands}
            colors={colors}
            onSuccess={handleSuccess}
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}