'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import type { Product, ProductMetrics } from '~/lib/schemas/productSchema';
import type { Brand } from '~/lib/schemas/brandSchema';
import type { Color } from '~/lib/schemas/colorSchema';
import type { PaginatedResult } from '~/lib/queries/paginateQuery';
import ProductsTable from './ProductsTable';
import ProductCreateForm from '../catalog/ProductCreateForm';
import { MetricCard } from '~/components/ui/metric-card';
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
import { Package, BoxIcon, CheckCircle, ShoppingCart } from 'lucide-react';
interface ProductsClientUIProps {
  paginatedProducts: PaginatedResult<Product>;
  metrics: ProductMetrics;
  brands: Brand[];
  colors: Color[];
}

export default function ProductsClientUI({ paginatedProducts, metrics, brands, colors }: ProductsClientUIProps) {
  const [products, setProducts] = useState<Product[]>(paginatedProducts.data);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentPage, totalPages, pageSize } = paginatedProducts.metadata;

  useEffect(() => {
    setProducts(paginatedProducts.data);
  }, [paginatedProducts.data]);

  const handlePageChange = (newPage: number) => {
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set('page', String(newPage));
    router.push(`/products?${currentParams.toString()}`);
  };

  const handleProductCreated = () => {
    setIsCreateModalOpen(false);
    router.refresh();
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis-start');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis-end');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tổng sản phẩm"
          value={metrics.totalProducts}
          description="Loại sản phẩm khác nhau"
          variant="blue"
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Tổng số lượng"
          value={metrics.totalItems}
          description="Tất cả các mặt hàng"
          variant="purple"
          icon={<BoxIcon className="h-5 w-5" />}
        />
        <MetricCard
          title="Hàng có sẵn"
          value={metrics.availableItems}
          description="Sẵn sàng bán"
          variant="emerald"
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Đã bán"
          value={metrics.soldItems}
          description="Sản phẩm đã bán"
          variant="pink"
          icon={<ShoppingCart className="h-5 w-5" />}
        />
      </div>

      {/* Products Table */}
      <DataTableCard
        title="Danh sách sản phẩm"
        action={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm
          </Button>
        }
      >
        <ProductsTable products={products} />
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

      {/* Create Product Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm mới</DialogTitle>
          </DialogHeader>
          <ProductCreateForm 
            brands={brands}
            colors={colors}
            onSuccess={handleProductCreated}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
