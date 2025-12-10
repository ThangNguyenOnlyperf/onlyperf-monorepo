import {
  Clock,
  Play,
  CheckCircle2,
  ShoppingCart,
  PackageCheck,
  Package,
  Truck,
  RotateCcw,
} from 'lucide-react';
import type { BundleStatus, InventoryStatus } from '~/actions/types';

export interface StatusConfig {
  label: string;
  color: string;
  icon: React.ElementType;
}

// ============================================
// Bundle Status Configuration
// ============================================

export const bundleStatusConfig: Record<BundleStatus, StatusConfig> = {
  pending: {
    label: 'Chờ xử lý',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
  },
  assembling: {
    label: 'Đang lắp ráp',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
  },
  completed: {
    label: 'Hoàn thành',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
  },
  sold: {
    label: 'Đã bán',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: ShoppingCart,
  },
};

// ============================================
// Inventory Status Configuration
// ============================================

export const inventoryStatusConfig: Record<InventoryStatus, StatusConfig> = {
  in_stock: {
    label: 'Trong kho',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: PackageCheck,
  },
  allocated: {
    label: 'Đã phân bổ',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Package,
  },
  sold: {
    label: 'Đã bán',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: ShoppingCart,
  },
  shipped: {
    label: 'Đã giao',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: Truck,
  },
  returned: {
    label: 'Đã trả',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: RotateCcw,
  },
};

// ============================================
// Source Type Labels
// ============================================

export const sourceTypeLabels: Record<string, string> = {
  assembly: 'Lắp ráp',
  inbound: 'Nhập kho',
  return: 'Trả hàng',
};

// ============================================
// Helper Functions
// ============================================

export function getBundleStatusLabel(status: BundleStatus): string {
  return bundleStatusConfig[status]?.label ?? status;
}

export function getInventoryStatusLabel(status: InventoryStatus): string {
  return inventoryStatusConfig[status]?.label ?? status;
}
