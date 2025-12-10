import { getInventoryStatsAction, getInventoryAction } from '~/actions/inventoryActions';
import InventoryClientUI from '~/components/inventory/InventoryClientUI';

export default async function InventoryPage() {
  const [statsResult, inventoryResult] = await Promise.all([
    getInventoryStatsAction(),
    getInventoryAction(undefined, { page: 1, pageSize: 50 }),
  ]);

  const stats = statsResult.success ? statsResult.data : {
    inStock: 0,
    allocated: 0,
    sold: 0,
    shipped: 0,
    returned: 0,
    total: 0,
  };

  const inventoryData = inventoryResult.success ? inventoryResult.data : {
    data: [],
    metadata: {
      currentPage: 1,
      pageSize: 50,
      totalPages: 0,
      totalItems: 0,
    },
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tồn kho</h1>
        <p className="text-muted-foreground">
          Quản lý sản phẩm trong kho với mã QR
        </p>
      </div>

      <InventoryClientUI
        initialStats={stats!}
        initialInventory={inventoryData!}
      />
    </div>
  );
}
