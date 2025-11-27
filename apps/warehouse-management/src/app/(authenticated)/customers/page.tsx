import { getCustomersList } from '~/actions/customerActions';
import CustomersDashboardClientUI from '~/components/customers/CustomersDashboardClientUI';

interface CustomersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'name' | 'totalSpent' | 'totalOrders' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }>;
}

const DEFAULT_PAGE_SIZE = 20;

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  
  const page = params.page ? parseInt(params.page, 10) : 1;
  const offset = (page - 1) * DEFAULT_PAGE_SIZE;

  // Parse dates if provided
  const startDate = params.startDate ? new Date(params.startDate) : undefined;
  const endDate = params.endDate ? new Date(params.endDate) : undefined;

  // Fetch customers with filters
  const customersResult = await getCustomersList({
    limit: DEFAULT_PAGE_SIZE,
    offset,
    search: params.search,
    startDate,
    endDate,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });

  return (
    <CustomersDashboardClientUI
      initialCustomers={customersResult.data?.customers ?? []}
      totalCustomers={customersResult.data?.total ?? 0}
      currentPage={page}
      pageSize={DEFAULT_PAGE_SIZE}
    />
  );
}