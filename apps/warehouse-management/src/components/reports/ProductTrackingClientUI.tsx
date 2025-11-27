'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { MetricCard } from '~/components/ui/metric-card';
import { FilterCard } from '~/components/ui/filter-card';
import { DataTableCard } from '~/components/ui/data-table-card';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '~/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  Package,
  Truck,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  QrCode,
  Eye,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  ProductTrackingItem,
  ProductTrackingFilters,
  ProductTrackingStats,
} from '~/actions/reportActions';
import { cn } from '~/lib/utils';
import type { Color } from '~/lib/schemas/colorSchema';
import ColorDot from '~/components/ui/ColorDot';

interface ProductTrackingClientUIProps {
  initialData: {
    items: ProductTrackingItem[];
    stats: ProductTrackingStats;
    totalPages: number;
    currentPage: number;
  };
  filters: ProductTrackingFilters;
  colors?: Color[];
}

const statusOptions = [
  { value: 'pending', label: 'Chờ nhập kho', icon: AlertCircle, color: 'amber' },
  { value: 'received', label: 'Trong kho', icon: Package, color: 'emerald' },
  { value: 'sold', label: 'Đã bán', icon: ShoppingCart, color: 'blue' },
  { value: 'shipped', label: 'Đã giao', icon: CheckCircle, color: 'primary' },
  { value: 'returned', label: 'Hoàn trả', icon: RotateCcw, color: 'red' },
];

export default function ProductTrackingClientUI({
  initialData,
  filters,
  colors = [],
}: ProductTrackingClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(filters.search ?? '');
  const [startDate, setStartDate] = useState(filters.startDate ?? '');
  const [endDate, setEndDate] = useState(filters.endDate ?? '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(filters.status ?? []);
  const [isPending, startTransition] = useTransition();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status: ProductTrackingItem['status']) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    if (!statusConfig) return <Badge>{status}</Badge>;

    const colorClasses = {
      amber: 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-700 border-amber-500/20',
      emerald: 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20',
      blue: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20',
      primary: 'bg-gradient-to-r from-primary/10 to-primary/20 text-primary border-primary/20',
      red: 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 border-red-500/20',
    };

    const Icon = statusConfig.icon;

    return (
      <Badge 
        variant="outline" 
        className={cn('font-medium', colorClasses[statusConfig.color as keyof typeof colorClasses])}
      >
        <Icon className="mr-1 h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach(status => params.append('status', status));
    }
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', '1');

    startTransition(() => {
      router.push(`/reports/products?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));

    startTransition(() => {
      router.push(`/reports/products?${params.toString()}`);
    });
  };

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleViewDetails = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };
  const colorHexByName = new Map(colors.map(c => [c.name, c.hex] as const));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Theo dõi sản phẩm</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi vòng đời sản phẩm từ nhập kho đến giao hàng
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Chờ nhập kho"
          value={initialData.stats.pendingCount}
          description={`${Math.round((initialData.stats.pendingCount / initialData.stats.totalItems) * 100)}% tổng số`}
          icon={<AlertCircle className="h-4 w-4" />}
          variant="amber"
        />

        <MetricCard
          title="Trong kho"
          value={initialData.stats.receivedCount}
          description={`${Math.round((initialData.stats.receivedCount / initialData.stats.totalItems) * 100)}% tổng số`}
          icon={<Package className="h-4 w-4" />}
          variant="emerald"
        />

        <MetricCard
          title="Đã bán"
          value={initialData.stats.soldCount}
          description={`${Math.round((initialData.stats.soldCount / initialData.stats.totalItems) * 100)}% tổng số`}
          icon={<ShoppingCart className="h-4 w-4" />}
          variant="blue"
        />

        <MetricCard
          title="Đã giao"
          value={initialData.stats.shippedCount}
          description={`${Math.round((initialData.stats.shippedCount / initialData.stats.totalItems) * 100)}% tổng số`}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="cyan"
        />

        <MetricCard
          title="Hoàn trả"
          value={initialData.stats.returnedCount}
          description={`${Math.round((initialData.stats.returnedCount / initialData.stats.totalItems) * 100)}% tổng số`}
          icon={<RotateCcw className="h-4 w-4" />}
          variant="pink"
        />
      </div>

      {/* Filters */}
      <FilterCard title={
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Bộ lọc
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo QR, tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-2 hover:border-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 justify-between">
                <span className="truncate">
                  {selectedStatuses.length > 0
                    ? `${selectedStatuses.length} trạng thái`
                    : 'Lọc trạng thái'}
                </span>
                <Filter className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Chọn trạng thái</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((status) => {
                const Icon = status.icon;
                return (
                  <DropdownMenuCheckboxItem
                    key={status.value}
                    checked={selectedStatuses.includes(status.value)}
                    onCheckedChange={() => handleStatusToggle(status.value)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {status.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            type="date"
            placeholder="Từ ngày"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 border-2 hover:border-primary/30 focus:border-primary"
          />

          <Input
            type="date"
            placeholder="Đến ngày"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 border-2 hover:border-primary/30 focus:border-primary"
          />

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

      {/* Products Table */}
      <DataTableCard title={`Danh sách sản phẩm (${initialData.stats.totalItems})`}>
        <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 first:rounded-tl-md">Sản phẩm</TableHead>
                  <TableHead className="bg-muted/50">QR Code</TableHead>
                  <TableHead className="bg-muted/50">Lô hàng</TableHead>
                  <TableHead className="bg-muted/50">Đơn hàng</TableHead>
                  <TableHead className="bg-muted/50">Trạng thái</TableHead>
                  <TableHead className="bg-muted/50">Khách hàng</TableHead>
                  <TableHead className="bg-muted/50">Kho</TableHead>
                  <TableHead className="bg-muted/50">Bảo hành</TableHead>
                  <TableHead className="bg-muted/50">Ngày nhập</TableHead>
                  <TableHead className="bg-muted/50 text-center last:rounded-tr-md">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {item.product.color && (
                            <ColorDot hex={colorHexByName.get(item.product.color)} size={12} title={item.product.color} />
                          )}
                          {item.product.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.product.brand} - {item.product.model}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <QrCode className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs">{item.qrCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{item.shipment.receiptNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.shipment.receiptDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.order ? (
                        <Badge variant="outline" className="font-mono">
                          {item.order.orderNumber}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.customer ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.customer.name}</span>
                          <span className="text-xs text-muted-foreground">{item.customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.storage ? (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.storage.name}</span>
                          <span className="text-xs text-muted-foreground">{item.storage.location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">Chưa có</span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item.id)}
                        className="hover:scale-[1.02] active:scale-[0.98]"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {initialData.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="text-muted-foreground">
                        Không tìm thấy sản phẩm nào
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {initialData.totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (initialData.currentPage > 1) {
                          handlePageChange(initialData.currentPage - 1);
                        }
                      }}
                      aria-disabled={initialData.currentPage <= 1}
                      className={cn(
                        initialData.currentPage <= 1 && 'pointer-events-none opacity-50',
                        'cursor-pointer'
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, initialData.totalPages) }).map((_, i) => {
                    let pageNum;
                    if (initialData.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (initialData.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (initialData.currentPage >= initialData.totalPages - 2) {
                      pageNum = initialData.totalPages - 4 + i;
                    } else {
                      pageNum = initialData.currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                          isActive={initialData.currentPage === pageNum}
                          className="cursor-pointer"
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
                        if (initialData.currentPage < initialData.totalPages) {
                          handlePageChange(initialData.currentPage + 1);
                        }
                      }}
                      aria-disabled={initialData.currentPage >= initialData.totalPages}
                      className={cn(
                        initialData.currentPage >= initialData.totalPages && 'pointer-events-none opacity-50',
                        'cursor-pointer'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
      </DataTableCard>
    </div>
  );
}
