import { Badge } from '~/components/ui/badge';

export function getDeliveryStatusBadge(status: string) {
  switch (status) {
    case 'processing':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Đang xử lý</Badge>;
    case 'waiting_for_delivery':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Chờ giao hàng</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Đã giao</Badge>;
    case 'failed':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Giao thất bại</Badge>;
    case 'shipped':
      return <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">Đã gửi hàng</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'Unpaid':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Chưa thanh toán</Badge>;
    case 'Paid':
      return <Badge className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-700 border-emerald-500/20">Đã thanh toán</Badge>;
    case 'Cancelled':
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Đã hủy</Badge>;
    case 'Refunded':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Đã hoàn tiền</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
