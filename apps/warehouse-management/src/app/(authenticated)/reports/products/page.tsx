import { getProductTrackingReport, type ProductTrackingFilters } from '~/actions/reportActions';
import ProductTrackingClientUI from '~/components/reports/ProductTrackingClientUI';
import { getColorsAction } from '~/actions/colorActions';

interface ProductsReportPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string | string[];
    shipmentId?: string;
    orderId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
    sortBy?: 'createdAt' | 'scannedAt' | 'product' | 'shipment';
    sortOrder?: 'asc' | 'desc';
  }>;
}

export default async function ProductsReportPage({ searchParams }: ProductsReportPageProps) {
  const params = await searchParams;
  
  // Parse filters from search params
  const filters: ProductTrackingFilters = {
    search: params.search,
    status: params.status 
      ? Array.isArray(params.status) 
        ? params.status 
        : [params.status]
      : undefined,
    shipmentId: params.shipmentId,
    orderId: params.orderId,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: params.pageSize ? parseInt(params.pageSize, 10) : 50,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };

  // Fetch data
  const [result, colorsResult] = await Promise.all([
    getProductTrackingReport(filters),
    getColorsAction(),
  ]);

  if (!result.success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">
          Không thể tải dữ liệu báo cáo: {result.message}
        </div>
      </div>
    );
  }

  return (
    <ProductTrackingClientUI
      initialData={result.data!}
      filters={filters}
      colors={colorsResult.success ? colorsResult.data! : []}
    />
  );
}
