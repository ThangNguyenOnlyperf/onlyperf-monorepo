'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination';
import {
  Package,
  PackageCheck,
  ShoppingCart,
  Truck,
  RotateCcw,
  Search,
  QrCode,
  Loader2,
  Eye,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInventoryAction,
  getInventoryStatsAction,
  type InventoryStats,
  type InventoryWithRelations,
  type InventoryFilters,
  type InventoryStatus,
} from '~/actions/inventoryActions';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';

interface InventoryClientUIProps {
  initialStats: InventoryStats;
  initialInventory: PaginatedResult<InventoryWithRelations>;
}

const statusConfig: Record<InventoryStatus, { label: string; color: string; icon: React.ElementType }> = {
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

const sourceTypeLabels: Record<string, string> = {
  assembly: 'Lắp ráp',
  inbound: 'Nhập kho',
  return: 'Trả hàng',
};

export default function InventoryClientUI({
  initialStats,
  initialInventory,
}: InventoryClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<InventoryStats>(initialStats);
  const [inventory, setInventory] = useState<PaginatedResult<InventoryWithRelations>>(initialInventory);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryWithRelations | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleSearch = async () => {
    startTransition(async () => {
      const filters: InventoryFilters = {};
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const result = await getInventoryAction(filters, { page: 1, pageSize: 50 });
      if (result.success && result.data) {
        setInventory(result.data);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(async () => {
      const filters: InventoryFilters = {};
      if (searchQuery) filters.search = searchQuery;
      if (statusFilter !== 'all') filters.status = statusFilter;

      const result = await getInventoryAction(filters, { page: newPage, pageSize: 50 });
      if (result.success && result.data) {
        setInventory(result.data);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleStatusFilterChange = async (value: string) => {
    const newStatus = value as InventoryStatus | 'all';
    setStatusFilter(newStatus);

    startTransition(async () => {
      const filters: InventoryFilters = {};
      if (searchQuery) filters.search = searchQuery;
      if (newStatus !== 'all') filters.status = newStatus;

      const result = await getInventoryAction(filters, { page: 1, pageSize: 50 });
      if (result.success && result.data) {
        setInventory(result.data);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleViewDetail = (item: InventoryWithRelations) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const { currentPage, totalPages } = inventory.metadata;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Trong kho</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{stats.inStock.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Đã phân bổ</CardTitle>
            <Package className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.allocated.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Đã bán</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.sold.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Đã giao</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.shipped.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Đã trả</CardTitle>
            <RotateCcw className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.returned.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Tổng cộng</CardTitle>
            <Layers className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Tìm theo mã QR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="in_stock">Trong kho</SelectItem>
                <SelectItem value="allocated">Đã phân bổ</SelectItem>
                <SelectItem value="sold">Đã bán</SelectItem>
                <SelectItem value="shipped">Đã giao</SelectItem>
                <SelectItem value="returned">Đã trả</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Danh sách tồn kho ({inventory.metadata.totalItems.toLocaleString()} sản phẩm)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có sản phẩm nào trong kho</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 first:rounded-tl-md">Mã QR</TableHead>
                    <TableHead className="bg-muted/50">Sản phẩm</TableHead>
                    <TableHead className="bg-muted/50">Nguồn</TableHead>
                    <TableHead className="bg-muted/50">Trạng thái</TableHead>
                    <TableHead className="bg-muted/50">Ngày tạo</TableHead>
                    <TableHead className="bg-muted/50 last:rounded-tr-md">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.data.map((item) => {
                    const statusInfo = statusConfig[item.status as InventoryStatus];
                    const StatusIcon = statusInfo?.icon ?? Package;
                    return (
                      <TableRow key={item.id} className="hover:bg-primary/5">
                        <TableCell className="font-mono text-sm font-medium">
                          {item.qrCode}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product?.name ?? '-'}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.product?.brand} - {item.product?.model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {sourceTypeLabels[item.sourceType] ?? item.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusInfo?.color ?? ''} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo?.label ?? item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) handlePageChange(currentPage - 1);
                          }}
                          aria-disabled={currentPage <= 1}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
                        />
                      </PaginationItem>
                      {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) handlePageChange(currentPage + 1);
                          }}
                          aria-disabled={currentPage >= totalPages}
                          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Chi tiết sản phẩm
            </DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về sản phẩm trong kho
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Mã QR</span>
                <span className="font-mono text-lg font-bold">{selectedItem.qrCode}</span>
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Sản phẩm</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Tên:</span> {selectedItem.product?.name ?? '-'}</p>
                  <p><span className="text-muted-foreground">Thương hiệu:</span> {selectedItem.product?.brand ?? '-'}</p>
                  <p><span className="text-muted-foreground">Model:</span> {selectedItem.product?.model ?? '-'}</p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <h4 className="font-medium">Trạng thái</h4>
                <Badge className={statusConfig[selectedItem.status as InventoryStatus]?.color}>
                  {statusConfig[selectedItem.status as InventoryStatus]?.label ?? selectedItem.status}
                </Badge>
              </div>

              {/* Source */}
              <div className="space-y-2">
                <h4 className="font-medium">Nguồn gốc</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Loại:</span> {sourceTypeLabels[selectedItem.sourceType] ?? selectedItem.sourceType}</p>
                  {selectedItem.bundle && (
                    <p><span className="text-muted-foreground">Bundle:</span> {selectedItem.bundle.name} ({selectedItem.bundle.qrCode})</p>
                  )}
                  {selectedItem.storage && (
                    <p><span className="text-muted-foreground">Kho:</span> {selectedItem.storage.name}</p>
                  )}
                </div>
              </div>

              {/* Order Info */}
              {selectedItem.order && (
                <div className="space-y-2">
                  <h4 className="font-medium">Đơn hàng</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Mã đơn:</span> {selectedItem.order.orderNumber}</p>
                    {selectedItem.soldAt && (
                      <p><span className="text-muted-foreground">Ngày bán:</span> {formatDate(selectedItem.soldAt)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Warranty */}
              <div className="space-y-2">
                <h4 className="font-medium">Bảo hành</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Thời hạn:</span> {selectedItem.warrantyMonths} tháng</p>
                  {selectedItem.warrantyExpiresAt && (
                    <p><span className="text-muted-foreground">Hết hạn:</span> {formatDate(selectedItem.warrantyExpiresAt)}</p>
                  )}
                </div>
              </div>

              {/* Customer Portal */}
              {selectedItem.customerScanCount > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Khách hàng</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Số lần quét:</span> {selectedItem.customerScanCount}</p>
                    {selectedItem.firstScannedByCustomerAt && (
                      <p><span className="text-muted-foreground">Lần đầu quét:</span> {formatDate(selectedItem.firstScannedByCustomerAt)}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground pt-4 border-t">
                <p>Tạo lúc: {formatDate(selectedItem.createdAt)}</p>
                {selectedItem.createdByUser && (
                  <p>Người tạo: {selectedItem.createdByUser.name}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
