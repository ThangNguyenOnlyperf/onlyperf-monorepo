'use client';

import { MetricCard } from '~/components/ui/metric-card';
import { Card, CardContent } from '~/components/ui/card';
import {
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Package,
  RotateCcw,
} from 'lucide-react';
import type { DeliveryStats } from '../types';

interface DeliveryMetricsProps {
  stats: DeliveryStats;
}

export default function DeliveryMetrics({ stats }: DeliveryMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const calculateSuccessRate = () => {
    const total = stats.totalDeliveries;
    if (total === 0) return 0;
    return ((stats.deliveredCount / total) * 100).toFixed(1);
  };

  const resolutionCards = stats.resolutions ? [
    {
      title: 'Nhập lại kho',
      value: stats.resolutions.reImportingCount || 0,
      icon: Package,
      iconColor: 'text-gray-500',
    },
    {
      title: 'Trả về NCC',
      value: stats.resolutions.returningCount || 0,
      icon: RotateCcw,
      iconColor: 'text-gray-500',
    },
    {
      title: 'Giao lại',
      value: stats.resolutions.retryingCount || 0,
      icon: Truck,
      iconColor: 'text-gray-500',
    },
    {
      title: 'Đã giải quyết',
      value: stats.resolutions.completedCount || 0,
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Main Delivery Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Tổng giao hàng"
          value={stats.totalDeliveries}
          description={`Hôm nay: ${stats.todayDeliveries}`}
          icon={<Truck className="h-4 w-4" />}
          variant="cyan"
        />
        <MetricCard
          title="Giao thành công"
          value={stats.deliveredCount}
          description={`Tỷ lệ: ${calculateSuccessRate()}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          variant="emerald"
        />
        <MetricCard
          title="Chờ giao hàng"
          value={stats.waitingForDeliveryCount}
          description="Cần xử lý"
          icon={<Clock className="h-4 w-4" />}
          variant="amber"
        />
        <MetricCard
          title="Giao thất bại"
          value={stats.failedCount}
          description={`Cần giải quyết: ${stats.pendingResolutionCount}`}
          icon={<XCircle className="h-4 w-4" />}
          variant="pink"
        />
      </div>

      {/* Resolution Status */}
      {stats.failedCount > 0 && resolutionCards.length > 0 && (
        <div className="bg-gray-50 rounded-xl py-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gray-600" />
            Trạng thái xử lý giao thất bại
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {resolutionCards.map((card) => {
              const Icon = card.icon;
              return (
                <div 
                  key={card.title}
                  className="bg-white rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                    <span className="text-xs text-gray-600">{card.title}</span>
                  </div>
                  <div className={`text-lg font-semibold ${card.valueColor || 'text-gray-900'}`}>
                    {card.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Value Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                  Giá trị đã giao
                </p>
                <div className="text-xl font-semibold text-emerald-600">
                  {formatCurrency(stats.totalDeliveredValue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Từ {stats.deliveredCount} đơn hàng
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-1">
                  Giá trị thất bại
                </p>
                <div className="text-xl font-semibold text-red-600">
                  {formatCurrency(stats.totalFailedValue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Từ {stats.failedCount} đơn thất bại
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}