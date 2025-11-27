import { getOrdersList, getOrderStats } from '~/actions/orderActions';
import OrdersDashboardClientUI from '~/components/orders/OrdersDashboardClientUI';

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    customerType?: 'b2b' | 'b2c';
  }>;
}

const DEFAULT_PAGE_SIZE = 20;

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams;
  
  const page = params.page ? parseInt(params.page, 10) : 1;
  const offset = (page - 1) * DEFAULT_PAGE_SIZE;

  // Parse dates if provided
  const startDate = params.startDate ? new Date(params.startDate) : undefined;
  const endDate = params.endDate ? new Date(params.endDate) : undefined;

  // Fetch orders and stats in parallel
  const [ordersResult, statsResult] = await Promise.all([
    getOrdersList({
      limit: DEFAULT_PAGE_SIZE,
      offset,
      search: params.search,
      startDate,
      endDate,
      customerType: params.customerType,
    }),
    getOrderStats(),
  ]);

  return (
    <OrdersDashboardClientUI
      initialOrders={ordersResult.data?.orders ?? []}
      totalOrders={ordersResult.data?.total ?? 0}
      stats={statsResult.data}
      currentPage={page}
      pageSize={DEFAULT_PAGE_SIZE}
    />
  );
}