'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '~/components/ui/pagination';
import { Plus, Package, Home, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import StorageForm from './StorageForm';
import StoragesTable from './StoragesTable';
import type { Storage } from '~/actions/storageActions';
import {
  createStorageAction,
  updateStorageAction,
  deleteStorageAction
} from '~/actions/storageActions';
import type { StorageFormData } from './StorageSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { MetricCard } from '~/components/ui/metric-card';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';

interface StorageClientUIProps {
  paginatedStorages: PaginatedResult<Storage>;
  metrics: {
    totalStorages: number;
    totalCapacity: number;
    totalUsedCapacity: number;
    utilizationRate: number;
  };
}

export default function StorageClientUI({ 
  paginatedStorages, 
  metrics: initialMetrics 
}: StorageClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storages, setStorages] = useState<Storage[]>(paginatedStorages.data);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [selectedStorage, setSelectedStorage] = useState<Storage | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { currentPage, totalPages, pageSize } = paginatedStorages.metadata;

  useEffect(() => {
    setStorages(paginatedStorages.data);
  }, [paginatedStorages.data]);

  const handlePageChange = (newPage: number) => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set('page', String(newPage));
    router.push(`/storages?${currentParams.toString()}`);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleCreate = async (data: StorageFormData) => {
    startTransition(async () => {
      const result = await createStorageAction(data);
      if (result.success && result.data) {
        toast.success(result.message);
        setIsCreateOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Lỗi khi tạo kho');
      }
    });
  };

  const handleEdit = async (data: StorageFormData) => {
    if (!selectedStorage) return;
    
    startTransition(async () => {
      const result = await updateStorageAction(selectedStorage.id, data);
      if (result.success && result.data) {
        toast.success(result.message);
        setIsEditOpen(false);
        setSelectedStorage(null);
        router.refresh();
      } else {
        toast.error(result.error || 'Lỗi khi cập nhật kho');
      }
    });
  };

  const handleDelete = async (storage: Storage) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa kho "${storage.name}"?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStorageAction(storage.id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error || 'Lỗi khi xóa kho');
      }
    });
  };


  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Tổng số kho"
          value={metrics.totalStorages}
          description="kho hàng"
          icon={<Home className="h-4 w-4" />}
          variant="purple"
        />

        <MetricCard
          title="Tổng sức chứa"
          value={metrics.totalCapacity}
          description="sản phẩm"
          icon={<Package className="h-4 w-4" />}
          variant="cyan"
        />

        <MetricCard
          title="Đã sử dụng"
          value={metrics.totalUsedCapacity}
          description="sản phẩm"
          icon={<BarChart3 className="h-4 w-4" />}
          variant="amber"
        />

        <MetricCard
          title="Tỷ lệ sử dụng"
          value={`${metrics.utilizationRate}%`}
          description="tổng sức chứa"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="emerald"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Danh sách kho</h2>
          <p className="text-muted-foreground">
            Quản lý các kho chứa hàng trong hệ thống
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Tạo kho mới
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo kho mới</DialogTitle>
              <DialogDescription>
                Nhập thông tin để tạo kho chứa hàng mới
              </DialogDescription>
            </DialogHeader>
            <StorageForm 
              onSubmit={handleCreate}
              isPending={isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Storage Table */}
      <StoragesTable
        storages={storages}
        onEdit={(storage) => {
          setSelectedStorage(storage);
          setIsEditOpen(true);
        }}
        onDelete={handleDelete}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa kho</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin kho {selectedStorage?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStorage && (
            <StorageForm 
              defaultValues={{
                name: selectedStorage.name,
                location: selectedStorage.location,
                capacity: selectedStorage.capacity,
                priority: selectedStorage.priority,
              }}
              onSubmit={handleEdit}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (currentPage > 1) handlePageChange(currentPage - 1);
                }}
                aria-disabled={currentPage <= 1}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            
            {renderPageNumbers().map((page, index) => {
              if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              
              const pageNum = page as number;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e: React.MouseEvent) => {
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
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (currentPage < totalPages) handlePageChange(currentPage + 1);
                }}
                aria-disabled={currentPage >= totalPages}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}