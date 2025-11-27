import { MetricCard } from '~/components/ui/metric-card';
import { Package, FileText, Clock, CheckCircle, Archive } from 'lucide-react';
import type { ShipmentMetrics } from '~/actions/shipmentActions';

interface ShipmentMetricsCardsProps {
  metrics: ShipmentMetrics;
}

export default function ShipmentMetricsCards({ metrics }: ShipmentMetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Tổng phiếu nhập"
        value={metrics.totalShipments}
        description="Tất cả phiếu nhập"
        icon={<FileText className="h-4 w-4" />}
        variant="blue"
      />
      <MetricCard
        title="Đang chờ"
        value={metrics.pendingShipments}
        description="Chờ xử lý"
        icon={<Clock className="h-4 w-4" />}
        variant="amber"
      />
      <MetricCard
        title="Đã nhận"
        value={metrics.receivedShipments}
        description="Đã nhận hàng"
        icon={<CheckCircle className="h-4 w-4" />}
        variant="emerald"
      />
      <MetricCard
        title="Hoàn thành"
        value={metrics.completedShipments}
        description="Đã hoàn tất"
        icon={<Archive className="h-4 w-4" />}
        variant="purple"
      />
      <MetricCard
        title="Tổng sản phẩm"
        value={metrics.totalItems}
        description="Sản phẩm đã nhập"
        icon={<Package className="h-4 w-4" />}
        variant="cyan"
      />
    </div>
  );
}