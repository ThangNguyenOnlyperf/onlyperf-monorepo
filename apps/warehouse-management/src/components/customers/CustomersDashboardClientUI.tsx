'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
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
  Search,
  Filter,
  Users,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import type { CustomerDetail } from '~/actions/customerActions';
import { format } from 'date-fns';

interface CustomersDashboardClientUIProps {
  initialCustomers: CustomerDetail[];
  totalCustomers: number;
  currentPage: number;
  pageSize: number;
}

export default function CustomersDashboardClientUI({
  initialCustomers,
  totalCustomers,
  currentPage,
  pageSize,
}: CustomersDashboardClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') ?? 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') ?? 'desc');
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(totalCustomers / pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Chưa có';
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/customers?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    
    startTransition(() => {
      router.push(`/customers?${params.toString()}`);
    });
  };


  const handleReset = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    startTransition(() => {
      router.push('/customers');
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý khách hàng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi và quản lý thông tin khách hàng
          </p>
        </div>
      </div>

      {/* Filters */}
      <FilterCard title={
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Bộ lọc và tìm kiếm
        </div>
      }>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên, SĐT, địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-2 hover:border-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-10 border-2 hover:border-primary/30">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Ngày tạo</SelectItem>
              <SelectItem value="name">Tên khách hàng</SelectItem>
              <SelectItem value="totalSpent">Tổng chi tiêu</SelectItem>
              <SelectItem value="totalOrders">Số đơn hàng</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="h-10 border-2 hover:border-primary/30">
              <SelectValue placeholder="Thứ tự" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Giảm dần</SelectItem>
              <SelectItem value="asc">Tăng dần</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSearch}
            disabled={isPending}
            className="btn-primary"
          >
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isPending}
            className="hover:scale-[1.02] active:scale-[0.98]"
          >
            Đặt lại
          </Button>
        </div>
      </FilterCard>

      {/* B2C Customers Table */}
      <DataTableCard title={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Khách hàng B2C ({initialCustomers.filter(c => c.customerType === 'b2c').length})
        </div>
      }>
        <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 first:rounded-tl-md">STT</TableHead>
                  <TableHead className="bg-muted/50">Tên khách hàng</TableHead>
                  <TableHead className="bg-muted/50">Số điện thoại</TableHead>
                  <TableHead className="bg-muted/50">Địa chỉ</TableHead>
                  <TableHead className="bg-muted/50 text-center">Số đơn</TableHead>
                  <TableHead className="bg-muted/50 text-right">Tổng chi tiêu</TableHead>
                  <TableHead className="bg-muted/50">Đơn gần nhất</TableHead>
                  <TableHead className="bg-muted/50 last:rounded-tr-md">Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCustomers.filter(c => c.customerType === 'b2c').map((customer, index) => (
                  <TableRow key={customer.id} className="hover:bg-primary/5 transition-all duration-200">
                    <TableCell className="font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-1 max-w-[200px] truncate" title={customer.address}>
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Chưa có</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20">
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        {customer.totalOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.totalSpent > 0 ? (
                        <span className="text-emerald-600">{formatCurrency(customer.totalSpent)}</span>
                      ) : (
                        <span className="text-muted-foreground">0 ₫</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(customer.lastOrderDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(customer.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
                {initialCustomers.filter(c => c.customerType === 'b2c').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Không có khách hàng B2C nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
      </DataTableCard>

      {/* B2B Customers Table */}
      <DataTableCard title={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Khách hàng B2B ({initialCustomers.filter(c => c.customerType === 'b2b').length})
        </div>
      }>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 first:rounded-tl-md">STT</TableHead>
                  <TableHead className="bg-muted/50">Tên khách hàng</TableHead>
                  <TableHead className="bg-muted/50">Số điện thoại</TableHead>
                  <TableHead className="bg-muted/50">Địa chỉ</TableHead>
                  <TableHead className="bg-muted/50 text-center">Số đơn</TableHead>
                  <TableHead className="bg-muted/50 text-right">Tổng chi tiêu</TableHead>
                  <TableHead className="bg-muted/50">Đơn gần nhất</TableHead>
                  <TableHead className="bg-muted/50 last:rounded-tr-md">Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialCustomers.filter(c => c.customerType === 'b2b').map((customer, index) => (
                  <TableRow key={customer.id} className="hover:bg-primary/5 transition-all duration-200">
                    <TableCell className="font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-1 max-w-[200px] truncate" title={customer.address}>
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Chưa có</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-purple-700 border-purple-500/20">
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        {customer.totalOrders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {customer.totalSpent > 0 ? (
                        <span className="text-emerald-600">{formatCurrency(customer.totalSpent)}</span>
                      ) : (
                        <span className="text-muted-foreground">0 ₫</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(customer.lastOrderDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(customer.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
                {initialCustomers.filter(c => c.customerType === 'b2b').length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Không có khách hàng B2B nào
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

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
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                          isActive={currentPage === pageNum}
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
                        if (currentPage < totalPages) handlePageChange(currentPage + 1);
                      }}
                      aria-disabled={currentPage >= totalPages}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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