'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Users,
  Search,
  Eye,
  Plus,
  Truck,
} from 'lucide-react';
import { MetricCard } from '~/components/ui/metric-card';
import { FilterCard } from '~/components/ui/filter-card';
import { DataTableCard } from '~/components/ui/data-table-card';
import type { OrderDetail, OrderStats } from '~/actions/orderActions';
import { format } from 'date-fns';
import ShipOrderModal from './ShipOrderModal';
import { getDeliveryStatusBadge } from '~/lib/orderStatusHelpers';

interface OrdersDashboardClientUIProps {
  initialOrders: OrderDetail[];
  totalOrders: number;
  stats?: OrderStats;
  currentPage: number;
  pageSize: number;
}

export default function OrdersDashboardClientUI({
  initialOrders,
  totalOrders,
  stats,
  currentPage,
  pageSize,
}: OrdersDashboardClientUIProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [customerType, setCustomerType] = useState(searchParams.get('customerType') ?? 'all');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? '');
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState(initialOrders);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  // Sync orders with props when they change
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const totalPages = Math.ceil(totalOrders / pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (customerType !== 'all') params.set('customerType', customerType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('page', '1');
    
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  };

  const handleViewOrder = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleShipOrder = (order: OrderDetail) => {
    setSelectedOrder(order);
    setShipModalOpen(true);
  };

  const handleShipSuccess = () => {
    // Refresh the page to get updated data
    router.refresh();
  };

  const handleNewOrder = () => {
    router.push('/outbound');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý đơn hàng</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi và quản lý tất cả đơn hàng
          </p>
        </div>
        <Button
          onClick={handleNewOrder}
          className="bg-gradient-to-r from-primary to-primary/90 hover:scale-[1.02] active:scale-[0.98] button-shine"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo đơn mới
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Tổng đơn hàng"
            value={stats.totalOrders}
            description={`Hôm nay: ${stats.todayOrders} đơn`}
            variant="blue"
            icon={<ShoppingCart className="h-5 w-5" />}
          />
          <MetricCard
            title="Tổng doanh thu"
            value={formatCurrency(stats.totalRevenue)}
            description={`Hôm nay: ${formatCurrency(stats.todayRevenue)}`}
            variant="emerald"
            icon={<DollarSign className="h-5 w-5" />}
          />
          <MetricCard
            title="Giá trị TB"
            value={formatCurrency(stats.averageOrderValue)}
            description="Trên mỗi đơn hàng"
            variant="purple"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            title="Khách hàng VIP"
            value={stats.topCustomers.length}
            description="Top chi tiêu cao nhất"
            variant="pink"
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Filters */}
      <FilterCard title="Bộ lọc">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm đơn hàng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-2 hover:border-primary/30 focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <Select value={customerType} onValueChange={setCustomerType}>
            <SelectTrigger className="h-10 border-2 hover:border-primary/30">
              <SelectValue placeholder="Loại khách hàng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
            </SelectContent>
          </Select>

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

          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={isPending}
              className="btn-primary"
            >
              <Search className="h-4 w-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>
        </div>
      </FilterCard>

      {/* Orders Table */}
      <DataTableCard title={`Danh sách đơn hàng (${totalOrders})`}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 first:rounded-tl-md">Mã đơn</TableHead>
                  <TableHead className="bg-muted/50">Shopify Order</TableHead>
                  <TableHead className="bg-muted/50">Khách hàng</TableHead>
                  <TableHead className="bg-muted/50">Số điện thoại</TableHead>
                  <TableHead className="bg-muted/50">Loại</TableHead>
                  <TableHead className="bg-muted/50">Số lượng</TableHead>
                  <TableHead className="bg-muted/50 text-right">Tổng tiền</TableHead>
                  <TableHead className="bg-muted/50">Thanh toán</TableHead>
                  <TableHead className="bg-muted/50">Trạng thái</TableHead>
                  <TableHead className="bg-muted/50">Ngày tạo</TableHead>
                  <TableHead className="bg-muted/50 text-center last:rounded-tr-md">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-primary/5 transition-all duration-200">
                    <TableCell className="font-medium">
                      <Badge variant="outline" className="font-mono">
                        {order.orderNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {order.shopifyOrderNumber ? (
                        <Badge variant="secondary" className="font-mono">
                          {order.shopifyOrderNumber}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{order.customer.name}</TableCell>
                    <TableCell>{order.customer.phone}</TableCell>
                    <TableCell>
                      <Badge variant={order.customerType === 'b2b' ? 'default' : 'secondary'}>
                        {order.customerType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.itemCount ?? 0}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getDeliveryStatusBadge(order.deliveryStatus)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                          className="hover:scale-[1.02] active:scale-[0.98]"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShipOrder(order)}
                          disabled={order.deliveryStatus !== 'processing'}
                          className={
                            order.deliveryStatus === 'processing'
                              ? "hover:scale-[1.02] active:scale-[0.98] text-primary hover:text-primary"
                              : "opacity-50 cursor-not-allowed"
                          }
                          title={
                            order.deliveryStatus === 'processing'
                              ? "Giao hàng"
                              : order.deliveryStatus === 'waiting_for_delivery'
                              ? "Đang chờ giao hàng"
                              : order.deliveryStatus === 'delivered'
                              ? "Đã giao hàng"
                              : "Không thể giao hàng"
                          }
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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

                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
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

      {/* Ship Order Modal */}
      <ShipOrderModal
        open={shipModalOpen}
        onOpenChange={setShipModalOpen}
        order={selectedOrder}
        onSuccess={handleShipSuccess}
      />
    </div>
  );
}