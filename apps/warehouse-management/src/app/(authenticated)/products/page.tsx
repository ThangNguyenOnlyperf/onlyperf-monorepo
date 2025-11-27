import { getProductsWithStockAction, getProductMetricsAction } from '~/actions/productActions';
import { getBrandsAction } from '~/actions/brandActions';
import { getColorsAction } from '~/actions/colorActions';
import ProductsClientUI from '~/components/products/ProductsClientUI';
import type { PaginationParams } from '~/lib/queries/paginateQuery';

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
}

const DEFAULT_PAGE_SIZE = 10;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : DEFAULT_PAGE_SIZE;
  const sortBy = params.sortBy;
  const sortOrder = params.sortOrder;

  const paginationParams: PaginationParams = {
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize,
    sortBy: sortBy || 'updatedAt',
    sortOrder: sortOrder || 'desc',
  };

  const [productsResult, metricsResult, brandsResult, colorsResult] = await Promise.all([
    getProductsWithStockAction(paginationParams),
    getProductMetricsAction(),
    getBrandsAction(),
    getColorsAction(),
  ]);

  const paginatedProducts = productsResult.success && productsResult.data 
    ? productsResult.data 
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
    totalProducts: 0,
    totalItems: 0,
    availableItems: 0,
    soldItems: 0,
  };

  const brands = brandsResult.success ? brandsResult.data! : [];
  const colors = colorsResult.success ? colorsResult.data! : [];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Quản lý sản phẩm
        </h1>
        <p className="text-muted-foreground">
          Quản lý danh mục sản phẩm và theo dõi tồn kho
        </p>
      </div>
      
      <ProductsClientUI 
        paginatedProducts={paginatedProducts} 
        metrics={metrics}
        brands={brands}
        colors={colors}
      />
    </div>
  );
}
