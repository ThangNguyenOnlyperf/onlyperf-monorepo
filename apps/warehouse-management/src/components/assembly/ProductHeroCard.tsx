'use client';

import { Package } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import type { AssemblyBundleItem } from '~/actions/assemblyActions';

interface ProductHeroCardProps {
  item: AssemblyBundleItem | null;
}

/**
 * Product identity display - HERO element
 * - Clean white card design (no glassmorphism)
 * - Large product name for quick identification
 * - Prominent pack size badge
 */
export default function ProductHeroCard({ item }: ProductHeroCardProps) {
  if (!item) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-slate-400 text-lg">Không có sản phẩm</p>
      </div>
    );
  }

  const { product } = item;
  const packSize = product?.packSize;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
      {/* Icon */}
      <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
        <Package className="w-7 h-7 text-primary" />
      </div>

      {/* Product Name - HERO */}
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
        {product?.name ?? 'Sản phẩm không xác định'}
      </h2>

      {/* Brand - Model */}
      {(product?.brand || product?.model) && (
        <p className="text-base text-slate-500 mt-1">
          {[product?.brand, product?.model].filter(Boolean).join(' - ')}
        </p>
      )}

      {/* Pack Size Badge - PROMINENT */}
      {packSize && (
        <div className="mt-5">
          <Badge className="text-lg px-5 py-2 bg-primary/10 text-primary border-0 font-bold">
            {packSize}-PACK
          </Badge>
        </div>
      )}
    </div>
  );
}
