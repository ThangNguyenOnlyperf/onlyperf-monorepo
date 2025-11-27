'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { Product } from '~/lib/schemas/productSchema';
import ColorDot from '~/components/ui/ColorDot';
import { Badge } from '~/components/ui/badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ProductShopifyCell from './ProductShopifyCell';
import { SHOPIFY_ENABLED } from '~/lib/shopify/config';
import { Layers, Package, Box } from 'lucide-react';
import { getProductTypeConfig } from '~/lib/constants/product-types';

interface ProductsTableProps {
  products: Product[];
}

export default function ProductsTable({ products }: ProductsTableProps) {
  const handleRowClick = (_productId: string) => {
    // TODO: action will be defined later
    return;
  };

  return (
    <div className="rounded-md border card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 first:rounded-tl-md">Tên sản phẩm</TableHead>
            <TableHead className="bg-muted/50">Loại</TableHead>
            <TableHead className="bg-muted/50">Thương hiệu</TableHead>
            <TableHead className="bg-muted/50">Model</TableHead>
            <TableHead className="bg-muted/50 text-center">Tổng SL</TableHead>
            <TableHead className="bg-muted/50 text-center">Còn lại</TableHead>
            <TableHead className="bg-muted/50">Danh mục</TableHead>
            {SHOPIFY_ENABLED ? <TableHead className="bg-muted/50">Shopify</TableHead> : null}
            <TableHead className="bg-muted/50 last:rounded-tr-md">Ngày tạo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={SHOPIFY_ENABLED ? 9 : 8} className="text-center py-8 text-muted-foreground">
                Chưa có sản phẩm nào. Nhấn &quot;Thêm sản phẩm&quot; để tạo mới.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow
                key={product.id}
                className="hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                onClick={() => handleRowClick(product.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <ColorDot
                      hex={product.colorHex}
                      size={12}
                      title={product.colorName ?? ''}
                    />
                    <span>{product.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    // Pack products get special display
                    if (product.isPackProduct) {
                      return (
                        <Badge variant="secondary" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {product.packSize}-Pack
                        </Badge>
                      );
                    }
                    // Use config for regular product types
                    const typeConfig = getProductTypeConfig(product.productType);
                    const IconMap = { Box, Package, Layers } as const;
                    const Icon = IconMap[typeConfig.icon];
                    const colorStyles: Record<string, string> = {
                      slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800',
                      primary: 'bg-primary/10 text-primary border-primary/20',
                      cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800',
                    };
                    return (
                      <Badge variant="outline" className={`text-xs ${colorStyles[typeConfig.colorClass] ?? ''}`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {typeConfig.label}
                      </Badge>
                    );
                  })()}
                </TableCell>
                <TableCell>{product.brandName ?? product.brand}</TableCell>
                <TableCell>{product.model}</TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20">
                    {product.totalQuantity ?? 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={
                      product.availableQuantity && product.availableQuantity > 0
                        ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20'
                        : 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 border-red-500/20'
                    }
                  >
                    {product.availableQuantity ?? 0}
                  </Badge>
                </TableCell>
                <TableCell>{product.category ?? '-'}</TableCell>
                {SHOPIFY_ENABLED ? (
                  <TableCell>
                    <ProductShopifyCell product={product} />
                  </TableCell>
                ) : null}
                <TableCell>
                  {format(new Date(product.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
