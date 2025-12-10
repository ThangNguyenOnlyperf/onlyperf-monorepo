'use client';

import { useState, useTransition } from 'react';
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
import { StatCard } from '~/components/ui/StatCard';
import { EmptyState } from '~/components/ui/EmptyState';
import {
  getInventoryAction,
  type InventoryStats,
  type InventoryWithRelations,
  type InventoryFilters,
} from '~/actions/inventoryActions';
import type { InventoryStatus } from '~/actions/types';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';
import { formatDate } from '~/lib/utils/formatDate';
import { inventoryStatusConfig, sourceTypeLabels } from '~/lib/constants/statusConfig';

interface InventoryClientUIProps {
  initialStats: InventoryStats;
  initialInventory: PaginatedResult<InventoryWithRelations>;
}

export default function InventoryClientUI({
  initialStats,
  initialInventory,
}: InventoryClientUIProps) {
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

  const { currentPage, totalPages } = inventory.metadata;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Trong kho" value={stats.inStock} icon={PackageCheck} colorScheme="emerald" />
        <StatCard title="Đã phân bổ" value={stats.allocated} icon={Package} colorScheme="amber" />
        <StatCard title="Đã bán" value={stats.sold} icon={ShoppingCart} colorScheme="blue" />
        <StatCard title="Đã giao" value={stats.shipped} icon={Truck} colorScheme="purple" />
        <StatCard title="Đã trả" value={stats.returned} icon={RotateCcw} colorScheme="red" />
        <StatCard title="Tổng cộng" value={stats.total} icon={Layers} colorScheme="slate" />
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
            <EmptyState icon={Package} title="Chưa có sản phẩm nào trong kho" />
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
                    const statusInfo = inventoryStatusConfig[item.status as InventoryStatus];
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
                <Badge className={inventoryStatusConfig[selectedItem.status as InventoryStatus]?.color}>
                  {inventoryStatusConfig[selectedItem.status as InventoryStatus]?.label ?? selectedItem.status}
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
