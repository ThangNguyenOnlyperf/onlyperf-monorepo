import { Badge } from '~/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertTriangle, Package, Truck } from 'lucide-react';

interface DeliveryStatusBadgeProps {
  status: string;
  className?: string;
}

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'waiting_for_delivery':
        return {
          label: 'Chờ giao hàng',
          className: 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-700 border-amber-500/20 hover:from-amber-500/15 hover:to-amber-600/15',
          icon: Clock,
        };
      case 'delivered':
        return {
          label: 'Đã giao thành công',
          className: 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20 hover:from-emerald-500/15 hover:to-emerald-600/15',
          icon: CheckCircle,
        };
      case 'failed':
        return {
          label: 'Giao thất bại',
          className: 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 border-red-500/20 hover:from-red-500/15 hover:to-red-600/15',
          icon: XCircle,
        };
      case 'cancelled':
        return {
          label: 'Đã hủy',
          className: 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-700 border-gray-500/20 hover:from-gray-500/15 hover:to-gray-600/15',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Không xác định',
          className: 'bg-muted text-muted-foreground',
          icon: Package,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`font-medium transition-all duration-200 ${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function ResolutionStatusBadge({ status, className }: { status: string; className?: string }) {
  const getResolutionConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Chờ xử lý',
          className: 'bg-gradient-to-r from-amber-500/10 to-amber-600/10 text-amber-700 border-amber-500/20',
          icon: Clock,
        };
      case 'in_progress':
        return {
          label: 'Đang xử lý',
          className: 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 text-blue-700 border-blue-500/20',
          icon: Package,
        };
      case 'completed':
        return {
          label: 'Đã hoàn thành',
          className: 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20',
          icon: CheckCircle,
        };
      default:
        return {
          label: 'Không xác định',
          className: 'bg-muted text-muted-foreground',
          icon: AlertTriangle,
        };
    }
  };

  const config = getResolutionConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`font-medium transition-all duration-200 ${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}