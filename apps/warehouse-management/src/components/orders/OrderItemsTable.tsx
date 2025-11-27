import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import type { OrderItemDetail } from '~/actions/orderActions';
import type { Color } from '~/lib/schemas/colorSchema';
import ColorDot from '~/components/ui/ColorDot';

interface OrderItemsTableProps {
  items: OrderItemDetail[];
  colors?: Color[];
}

export default function OrderItemsTable({ items, colors = [] }: OrderItemsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };
  const colorHexByName = new Map(colors.map(c => [c.name, c.hex] as const));

  return (
    <div className="rounded-md border card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 first:rounded-tl-md">STT</TableHead>
            <TableHead className="bg-muted/50">Mã QR</TableHead>
            <TableHead className="bg-muted/50">Sản phẩm</TableHead>
            <TableHead className="bg-muted/50">Thương hiệu</TableHead>
            <TableHead className="bg-muted/50">Model</TableHead>
            <TableHead className="bg-muted/50 text-center">SL</TableHead>
            <TableHead className="bg-muted/50 text-right">Đơn giá</TableHead>
            <TableHead className="bg-muted/50 text-right last:rounded-tr-md">Thành tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id} className="hover:bg-primary/5 transition-all duration-200">
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {item.qrCode}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {item.color && (
                    <ColorDot hex={colorHexByName.get(item.color)} size={12} title={item.color} />
                  )}
                  <span>{item.productName}</span>
                </div>
              </TableCell>
              <TableCell>{item.brand}</TableCell>
              <TableCell>{item.model}</TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.price * item.quantity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
