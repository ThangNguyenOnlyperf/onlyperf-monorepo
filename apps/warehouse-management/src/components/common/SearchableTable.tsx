'use client';

import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Search, X } from 'lucide-react';
import { useTableSearch } from '~/hooks/useTableSearch';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination';

interface SearchableTableProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  searchLabel?: string;
  children: React.ReactNode;
}

/**
 * Reusable searchable table component with URL state management
 * Integrates search input, pagination, and table content
 */
export default function SearchableTable({
  placeholder = 'Tìm kiếm...',
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  searchLabel = 'Tìm kiếm',
  children
}: SearchableTableProps) {
  const {
    searchQuery,
    setSearchQuery,
    clearSearch,
    isSearching
  } = useTableSearch({
    onSearch,
    debounceMs: 300
  });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 pl-9 pr-10"
            aria-label={searchLabel}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Xóa tìm kiếm</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Status */}
      {searchQuery && !isSearching && (
        <p className="text-sm text-muted-foreground">
          Đang hiển thị kết quả cho "{searchQuery}"
        </p>
      )}

      {/* Table Content */}
      <div className="rounded-md border card-shadow overflow-hidden">
        {children}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  if (currentPage > 1 && onPageChange) {
                    onPageChange(currentPage - 1);
                  }
                }}
                aria-disabled={currentPage <= 1}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            
            {/* Page numbers - simplified for example */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      if (onPageChange) {
                        onPageChange(pageNum);
                      }
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
                  if (currentPage < totalPages && onPageChange) {
                    onPageChange(currentPage + 1);
                  }
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