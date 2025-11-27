import { getShipmentsWithItemsAction, getShipmentMetricsAction } from '~/actions/shipmentActions';
import ShipmentsDashboardUI from '~/components/shipments/ShipmentsDashboardUI';
import type { PaginationParams } from '~/lib/queries/paginateQuery';
import type { ShipmentFilters } from '~/actions/shipmentActions';

interface ShipmentsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 10;

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : DEFAULT_PAGE_SIZE;
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder;

  const paginationParams: PaginationParams = {
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize,
    sortBy,
    sortOrder,
  };

  const filters: ShipmentFilters = {
    search: params.search,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
  };

  const [shipmentsResult, metricsResult] = await Promise.all([
    getShipmentsWithItemsAction(filters, paginationParams),
    getShipmentMetricsAction(),
  ]);

  const paginatedShipments = shipmentsResult.success && shipmentsResult.data
    ? shipmentsResult.data
    : {
        data: [],
        metadata: {
          currentPage: 1,
          pageSize: DEFAULT_PAGE_SIZE,
          totalPages: 0,
          totalItems: 0,
        },
      };

  const metrics = metricsResult.success ? metricsResult.data! : {
    totalShipments: 0,
    pendingShipments: 0,
    receivedShipments: 0,
    completedShipments: 0,
    totalItems: 0,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản lý phiếu nhập</h1>
        <p className="text-muted-foreground">
          Xem và quản lý tất cả phiếu nhập hàng
        </p>
      </div>
      
      <ShipmentsDashboardUI 
        paginatedShipments={paginatedShipments} 
        initialMetrics={metrics} 
      />
    </div>
  );
}