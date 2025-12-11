'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ShipmentWithItems, ShipmentMetrics, ShipmentFilters } from '~/actions/shipmentActions';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';
import ShipmentMetricsCards from './ShipmentMetricsCards';
import ShipmentsTable from './ShipmentsTable';
import { DataTableCard } from '~/components/ui/data-table-card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '~/components/ui/pagination';
import { Button } from '~/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Can } from '~/lib/permissions-context';
import { P } from '~/lib/permissions';
import { toast } from 'sonner';

interface ShipmentsDashboardUIProps {
  paginatedShipments: PaginatedResult<ShipmentWithItems>;
  initialMetrics: ShipmentMetrics;
}

export default function ShipmentsDashboardUI({ 
  paginatedShipments, 
  initialMetrics 
}: ShipmentsDashboardUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [shipments, setShipments] = useState(paginatedShipments.data);
  const [metrics] = useState(initialMetrics);
  const { currentPage, totalPages, pageSize } = paginatedShipments.metadata;

  useEffect(() => {
    setShipments(paginatedShipments.data);
  }, [paginatedShipments.data]);

  const handleRefresh = () => {
    router.refresh();
    toast.success('Đã tải lại danh sách phiếu nhập');
  };

  const handlePageChange = (newPage: number) => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set('page', String(newPage));
    router.push(`/shipments?${currentParams.toString()}`);
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

  const handleOpenPDF = (shipmentId: string) => {
    router.push(`/shipments/${shipmentId}/pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <ShipmentMetricsCards metrics={metrics} />

      {/* Shipments Table */}
      <DataTableCard
        title={`Danh sách phiếu nhập (${shipments.length})`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tải lại
            </Button>

            <Can permission={P.CREATE_SHIPMENTS}>
              <Button
                onClick={() => router.push('/shipments/new')}
                size="sm"
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tạo phiếu nhập
              </Button>
            </Can>
          </div>
        }
      >
        <ShipmentsTable
          shipments={shipments}
          onOpenPDF={handleOpenPDF}
          isPending={isPending}
        />
      </DataTableCard>

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