'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { 
  MoreHorizontal, 
  Eye, 
  FileText, 
  CheckCircle, 
  Package,
  Clock,
  ScanLine
} from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ShipmentWithItems } from '~/actions/shipmentActions';

interface ShipmentsTableProps {
  shipments: ShipmentWithItems[];
  onOpenPDF: (shipmentId: string) => void;
  isPending: boolean;
}

export default function ShipmentsTable({
  shipments,
  onOpenPDF,
  isPending
}: ShipmentsTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: 'Đang chờ', 
        className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        icon: Clock 
      },
      received: { 
        label: 'Đã nhận', 
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
        icon: Package 
      },
      completed: { 
        label: 'Hoàn thành', 
        className: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
        icon: CheckCircle 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`gap-1 font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };


  const ShipmentCard = ({ shipment }: { shipment: ShipmentWithItems }) => (
    <Card className="mb-4 card-shadow hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header row with receipt number and status */}
          <div className="flex items-center justify-between">
            <Link 
              href={`/shipments/${shipment.id}/scan`}
              className="flex items-center gap-2 hover:underline text-primary font-medium"
            >
              <ScanLine className="h-4 w-4" />
              {shipment.receiptNumber}
            </Link>
            {getStatusBadge(shipment.status)}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Ngày nhập:</span>
              <div className="mt-1">
                {format(new Date(shipment.receiptDate), 'dd/MM/yyyy', { locale: vi })}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Số lượng:</span>
              <div className="mt-1">
                <span className="font-medium">{shipment.itemCount}</span> sản phẩm
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Nhà cung cấp:</span>
              <div className="mt-1">{shipment.supplierName}</div>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Ngày tạo:</span>
              <div className="mt-1">
                {format(new Date(shipment.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  disabled={isPending}
                >
                  <span className="sr-only">Mở menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => router.push(`/shipments/${shipment.id}`)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenPDF(shipment.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Xem PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (shipments.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Chưa có phiếu nhập nào</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View */}
      <div className="block md:hidden">
        {shipments.map((shipment) => (
          <ShipmentCard key={shipment.id} shipment={shipment} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-muted/50 first:rounded-tl-md">Số phiếu</TableHead>
              <TableHead className="bg-muted/50">Ngày nhập</TableHead>
              <TableHead className="bg-muted/50">Nhà cung cấp</TableHead>
              <TableHead className="bg-muted/50">Số lượng</TableHead>
              <TableHead className="bg-muted/50">Trạng thái</TableHead>
              <TableHead className="bg-muted/50">Ngày tạo</TableHead>
              <TableHead className="bg-muted/50 last:rounded-tr-md text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => (
              <TableRow key={shipment.id} className="hover:bg-primary/5 transition-all duration-200">
                <TableCell className="font-medium">
                  <Link 
                    href={`/shipments/${shipment.id}/scan`}
                    className="flex items-center gap-2 hover:underline text-primary"
                  >
                    <ScanLine className="h-4 w-4" />
                    {shipment.receiptNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {format(new Date(shipment.receiptDate), 'dd/MM/yyyy', { locale: vi })}
                </TableCell>
                <TableCell>{shipment.supplierName}</TableCell>
                <TableCell>
                  <span className="font-medium">{shipment.itemCount}</span> sản phẩm
                </TableCell>
                <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                <TableCell>
                  {format(new Date(shipment.createdAt), 'dd/MM/yyyy', { locale: vi })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        disabled={isPending}
                      >
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => router.push(`/shipments/${shipment.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onOpenPDF(shipment.id)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Xem PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}