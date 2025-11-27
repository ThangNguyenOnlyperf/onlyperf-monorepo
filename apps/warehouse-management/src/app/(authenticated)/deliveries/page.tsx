import { getDeliveries } from '~/actions/deliveryActions';
import DeliveryTrackingClientUI from '~/components/deliveries/DeliveryTrackingClientUI';
import { redirect } from 'next/navigation';

interface DeliveryPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    search?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 10;

export default async function DeliveryPage(props: DeliveryPageProps) {
  const searchParams = await props.searchParams;
  
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : DEFAULT_PAGE_SIZE;
  const status = searchParams.status;
  const search = searchParams.search;

  const paginationParams = {
    page: isNaN(page) || page < 1 ? 1 : page,
    pageSize: isNaN(pageSize) || pageSize < 1 ? DEFAULT_PAGE_SIZE : pageSize,
    status,
    search,
  };

  const result = await getDeliveries(paginationParams);

  if (!result.success || !result.data) {
    // Could show an error page here
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-red-600">Không thể tải dữ liệu giao hàng</h2>
          <p className="text-muted-foreground mt-2">{result.message}</p>
        </div>
      </div>
    );
  }

  const { deliveries, total, stats } = result.data;

  return (
    <DeliveryTrackingClientUI
      initialDeliveries={deliveries}
      totalDeliveries={total}
      stats={stats}
      currentPage={paginationParams.page}
      pageSize={paginationParams.pageSize}
    />
  );
}