'use client';

import { useTransition, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { StatusBadge } from '~/components/ui/status-badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import { syncShopifyProductAction } from '~/actions/shopify/inventoryActions';
import type { Product } from '~/lib/schemas/productSchema';

interface ProductShopifyCellProps {
  product: Product;
}

export default function ProductShopifyCell({ product }: ProductShopifyCellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const getStatusBadgeInfo = () => {
    const status = product.shopifyLastSyncStatus;
    const hasError = !!product.shopifyLastSyncError;

    if (!product.shopifyProductId && !status) {
      return {
        variant: 'cancelled',
        label: 'Chưa đồng bộ',
        icon: undefined,
      };
    }

    switch (status) {
      case 'success':
        return {
          variant: 'shipped',
          label: 'Đã đồng bộ',
          icon: undefined,
        };
      case 'error':
        return {
          variant: 'failed',
          label: 'Lỗi đồng bộ',
          icon: hasError ? <AlertCircle className="h-3 w-3" /> : undefined,
        };
      case 'pending':
        return {
          variant: 'pending',
          label: 'Đang chờ',
          icon: undefined,
        };
      default:
        return {
          variant: 'cancelled',
          label: 'Không rõ trạng thái',
          icon: undefined,
        };
    }
  };

  const handleSyncClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    startTransition(async () => {
      try {
        const result = await syncShopifyProductAction(product.id);

        if (result.success) {
          toast.success(result.message ?? 'Đã đồng bộ Shopify thành công');
        } else {
          toast.error(result.error ?? result.message ?? 'Không thể đồng bộ Shopify');
        }

        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Không thể đồng bộ Shopify';
        toast.error(message);
      }
    });
  };

  const lastSyncedAt = product.shopifyLastSyncedAt
    ? new Date(product.shopifyLastSyncedAt)
    : null;

  const timestampText = lastSyncedAt
    ? `Cập nhật ${formatDistanceToNow(lastSyncedAt, {
        addSuffix: true,
        locale: vi,
      })}`
    : 'Chưa từng đồng bộ';

  const badgeInfo = getStatusBadgeInfo();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2.5">
        {/* Status Badge with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <StatusBadge
                status={badgeInfo.variant as any}
                label={badgeInfo.label}
                icon={badgeInfo.icon}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <div className="space-y-1">
              <p className="text-sm font-medium">{badgeInfo.label}</p>
              <p className="text-xs text-muted-foreground">{timestampText}</p>
              {product.shopifyLastSyncError && (
                <p className="text-xs text-red-400 mt-2">
                  Lỗi: {product.shopifyLastSyncError}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Sync Icon Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleSyncClick}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Đồng bộ</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
