'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterCard } from '~/components/ui/filter-card';
import { DataTableCard } from '~/components/ui/data-table-card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import {
  Truck,
  Search,
  Filter,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import DeliveryTable from './components/DeliveryTable';
import DeliveryStatusModal from './components/DeliveryStatusModal';
import FailureResolutionModal from './components/FailureResolutionModal';
import DeliveryHistoryModal from './components/DeliveryHistoryModal';
import DeliveryMetrics from './components/DeliveryMetrics';
import type { DeliveryWithOrder, DeliveryStats } from './types';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination';

interface DeliveryTrackingClientUIProps {
  initialDeliveries: DeliveryWithOrder[];
  totalDeliveries: number;
  stats: DeliveryStats;
  currentPage: number;
  pageSize: number;
}

export default function DeliveryTrackingClientUI({
  initialDeliveries,
  totalDeliveries,
  stats,
  currentPage,
  pageSize,
}: DeliveryTrackingClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [isPending, startTransition] = useTransition();

  // Sync deliveries state with props when they change (e.g., after search)
  useEffect(() => {
    setDeliveries(initialDeliveries);
  }, [initialDeliveries]);

  // Modal states
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithOrder | null>(null);

  const totalPages = Math.ceil(totalDeliveries / pageSize);

  const handleStatusUpdate = (delivery: DeliveryWithOrder) => {
    setSelectedDelivery(delivery);
    setStatusModalOpen(true);
  };

  const handleFailureResolution = (delivery: DeliveryWithOrder) => {
    setSelectedDelivery(delivery);
    setResolutionModalOpen(true);
  };

  const handleViewHistory = (delivery: DeliveryWithOrder) => {
    setSelectedDelivery(delivery);
    setHistoryModalOpen(true);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/deliveries?${params.toString()}`);
    });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/deliveries?${params.toString()}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Theo dõi giao hàng
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý và theo dõi trạng thái giao hàng
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {/* <DeliveryMetrics stats={stats} /> */}

      {/* Filters */}
      <FilterCard title="Bộ lọc">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã đơn, khách hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-2 hover:border-primary/30 hover:shadow-md focus:border-primary focus:shadow-lg focus:ring-2 focus:ring-primary/20 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 border-2 hover:border-primary/30 hover:shadow-md focus:border-primary focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder="Trạng thái giao hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="waiting_for_delivery">Chờ giao hàng</SelectItem>
              <SelectItem value="delivered">Đã giao thành công</SelectItem>
              <SelectItem value="failed">Giao thất bại</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="btn-primary"
          >
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>
        </div>
      </FilterCard>

      {/* Deliveries Table */}
      <DataTableCard
        title={`Danh sách giao hàng (${totalDeliveries})`}
        action={
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            Trang {currentPage} / {totalPages}
          </div>
        }
      >
        <DeliveryTable
          deliveries={deliveries}
          onStatusUpdate={handleStatusUpdate}
          onFailureResolution={handleFailureResolution}
          onViewHistory={handleViewHistory}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
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
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {/* Page numbers */}
                {(() => {
                  const pages = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <PaginationItem key={i}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(i);
                          }}
                          isActive={currentPage === i}
                          className="cursor-pointer"
                        >
                          {i}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                  return pages;
                })()}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) handlePageChange(currentPage + 1);
                    }}
                    aria-disabled={currentPage >= totalPages}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </DataTableCard>

      {/* Modals */}
      <DeliveryStatusModal
        open={statusModalOpen}
        onOpenChange={setStatusModalOpen}
        delivery={selectedDelivery}
        onSuccess={(updatedDelivery) => {
          setDeliveries(prev => prev.map(d => 
            d.id === updatedDelivery.id ? updatedDelivery : d
          ));
          setStatusModalOpen(false);
          toast.success("Đã cập nhật trạng thái giao hàng");
        }}
      />

      <FailureResolutionModal
        open={resolutionModalOpen}
        onOpenChange={setResolutionModalOpen}
        delivery={selectedDelivery}
        onSuccess={(updatedDelivery) => {
          setDeliveries(prev => prev.map(d => 
            d.id === updatedDelivery.id ? updatedDelivery : d
          ));
          setResolutionModalOpen(false);
          toast.success("Đã tạo quy trình xử lý");
        }}
      />

      <DeliveryHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        delivery={selectedDelivery}
      />
    </div>
  );
}