import { getStoragesAction, getStorageMetricsAction } from '~/actions/storageActions';
import StorageClientUI from '~/components/storages/StorageClientUI';
import type { PaginationParams } from '~/lib/queries/paginateQuery';

interface StoragesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
}

const DEFAULT_PAGE_SIZE = 10;

export default async function StoragesPage({ searchParams }: StoragesPageProps) {
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

  const [storagesResult, metricsResult] = await Promise.all([
    getStoragesAction(paginationParams),
    getStorageMetricsAction(),
  ]);

  const paginatedStorages = storagesResult.success && storagesResult.data
    ? storagesResult.data
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
    totalStorages: 0,
    totalCapacity: 0,
    totalUsedCapacity: 0,
    utilizationRate: 0,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Quản lý kho</h1>
        <p className="text-muted-foreground">
          Quản lý các kho chứa hàng và theo dõi sức chứa
        </p>
      </div>
      
      <StorageClientUI 
        paginatedStorages={paginatedStorages} 
        metrics={metrics} 
      />
    </div>
  );
}