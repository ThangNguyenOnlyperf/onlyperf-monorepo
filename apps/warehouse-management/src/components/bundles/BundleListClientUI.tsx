'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination';
import { Package, Plus, Eye, Trash2, QrCode } from 'lucide-react';
import { Can } from '~/lib/permissions-context';
import { P } from '~/lib/permissions';
import { toast } from 'sonner';
import { Progress } from '~/components/ui/progress';
import { EmptyState } from '~/components/ui/EmptyState';
import { DeleteConfirmDialog } from '~/components/ui/DeleteConfirmDialog';
import {
  getBundlesAction,
  deleteBundleAction,
  type BundleListItem,
  type BundleFilters,
} from '~/actions/bundleActions';
import type { BundleStatus } from '~/actions/types';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';
import { formatDate } from '~/lib/utils/formatDate';
import { bundleStatusConfig } from '~/lib/constants/statusConfig';

interface BundleListClientUIProps {
  initialBundles: PaginatedResult<BundleListItem>;
}

export default function BundleListClientUI({ initialBundles }: BundleListClientUIProps) {
  const [bundles, setBundles] = useState<PaginatedResult<BundleListItem>>(initialBundles);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<BundleStatus | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<BundleListItem | null>(null);

  const handleStatusFilterChange = async (value: string) => {
    const newStatus = value as BundleStatus | 'all';
    setStatusFilter(newStatus);

    startTransition(async () => {
      const filters: BundleFilters = {};
      if (newStatus !== 'all') filters.status = newStatus;

      const result = await getBundlesAction(filters, { page: 1, pageSize: 20 });
      if (result.success && result.data) {
        setBundles(result.data);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(async () => {
      const filters: BundleFilters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;

      const result = await getBundlesAction(filters, { page: newPage, pageSize: 20 });
      if (result.success && result.data) {
        setBundles(result.data);
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteBundleAction(deleteTarget.id);
      if (result.success) {
        toast.success(result.message);
        // Refresh list
        const filters: BundleFilters = {};
        if (statusFilter !== 'all') filters.status = statusFilter;
        const refreshResult = await getBundlesAction(filters, {
          page: bundles.metadata.currentPage,
          pageSize: 20,
        });
        if (refreshResult.success && refreshResult.data) {
          setBundles(refreshResult.data);
        }
      } else {
        toast.error(result.message);
      }
      setDeleteTarget(null);
    });
  };

  const { currentPage, totalPages } = bundles.metadata;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="assembling">Đang lắp ráp</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="sold">Đã bán</SelectItem>
          </SelectContent>
        </Select>

        <Can permission={P.CREATE_BUNDLES}>
          <Link href="/bundles/new">
            <Button className="bg-gradient-to-r from-primary to-primary/80">
              <Plus className="h-4 w-4 mr-2" />
              Tạo lô hàng mới
            </Button>
          </Link>
        </Can>
      </div>

      {/* Bundles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Danh sách lô hàng ({bundles.metadata.totalItems.toLocaleString()} lô)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bundles.data.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Chưa có lô hàng nào"
              description='Nhấn "Tạo lô hàng mới" để bắt đầu'
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50 first:rounded-tl-md">Mã QR</TableHead>
                    <TableHead className="bg-muted/50">Tên lô</TableHead>
                    <TableHead className="bg-muted/50">Tiến độ</TableHead>
                    <TableHead className="bg-muted/50">Trạng thái</TableHead>
                    <TableHead className="bg-muted/50">Ngày tạo</TableHead>
                    <TableHead className="bg-muted/50 last:rounded-tr-md">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles.data.map((bundle) => {
                    const statusInfo = bundleStatusConfig[bundle.status as BundleStatus];
                    const StatusIcon = statusInfo?.icon ?? Package;
                    const progress = bundle.totalExpected > 0
                      ? Math.round((bundle.totalScanned / bundle.totalExpected) * 100)
                      : 0;

                    return (
                      <TableRow key={bundle.id} className="hover:bg-primary/5">
                        <TableCell className="font-mono text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                            {bundle.qrCode}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{bundle.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {bundle._count.items} loại sản phẩm
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32 space-y-1">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              {bundle.totalScanned}/{bundle.totalExpected} ({progress}%)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusInfo?.color ?? ''} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo?.label ?? bundle.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(bundle.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link href={`/bundles/${bundle.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Can permission={P.DELETE_BUNDLES}>
                              {bundle.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(bundle)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </Can>
                          </div>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Xác nhận xóa lô hàng"
        description={`Bạn có chắc muốn xóa lô hàng "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
