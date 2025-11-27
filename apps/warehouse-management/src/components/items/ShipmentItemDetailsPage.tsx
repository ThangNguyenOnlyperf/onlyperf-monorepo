'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ShipmentItemDetails } from '~/actions/shipmentItemActions';
import { 
  Package, 
  QrCode,
  Calendar,
  Building2,
  Hash,
  ChevronLeft,
  Home,
  Clock,
  CheckCircle,
  Truck,
  ShoppingCart,
  MapPin,
  FileText,
  Palette,
  Weight,
  Ruler,
  Layers,
  Wrench,
  Maximize2,
  Circle
} from 'lucide-react';

import type { Color } from '~/lib/schemas/colorSchema';
import ColorDot from '~/components/ui/ColorDot';

interface ShipmentItemDetailsPageProps {
  itemDetails: ShipmentItemDetails;
  colors?: Color[];
}

export default function ShipmentItemDetailsPage({ itemDetails, colors = [] }: ShipmentItemDetailsPageProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        label: 'Đang chờ', 
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-yellow-600'
      },
      received: { 
        label: 'Đã nhận', 
        variant: 'default' as const,
        icon: CheckCircle,
        color: 'text-green-600'
      },
      sold: { 
        label: 'Đã bán', 
        variant: 'outline' as const,
        icon: ShoppingCart,
        color: 'text-blue-600'
      },
      shipped: { 
        label: 'Đã giao', 
        variant: 'secondary' as const,
        icon: Truck,
        color: 'text-gray-600'
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/shipments" className="hover:text-primary">
              Phiếu nhập
            </Link>
            <span>/</span>
            <Link 
              href={`/shipments/${itemDetails.shipment.id}`} 
              className="hover:text-primary"
            >
              {itemDetails.shipment.receiptNumber}
            </Link>
            <span>/</span>
            <span className="text-foreground">{itemDetails.qrCode}</span>
          </div>
          <h1 className="text-2xl font-bold">Chi tiết sản phẩm</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Thông tin sản phẩm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {itemDetails.product.brand} - {itemDetails.product.model}
                {itemDetails.product.colorName && (
                  <ColorDot hex={itemDetails.product.colorHex} size={12} title={itemDetails.product.colorName} />
                )}
              </h3>
              <p className="text-muted-foreground flex items-center gap-2">
                {itemDetails.product.name}
                {itemDetails.product.colorName && (
                  <span className="text-xs text-muted-foreground">({itemDetails.product.colorName})</span>
                )}
              </p>
            </div>
            
            {itemDetails.product.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Mô tả</p>
                <p className="text-sm">{itemDetails.product.description}</p>
              </div>
            )}
            
            {itemDetails.product.category && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Danh mục:</span>
                <Badge variant="outline">{itemDetails.product.category}</Badge>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Số lượng:</span>
              <span className="font-medium">{itemDetails.quantity}</span>
            </div>
          </CardContent>
        </Card>

        {/* QR Code and Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Mã QR & Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Large QR Code Display */}
            <div className="bg-gray-100 rounded-lg p-6 text-center">
              <QrCode className="h-24 w-24 mx-auto mb-4 text-gray-600" />
              <p className="font-mono text-lg font-bold">{itemDetails.qrCode}</p>
            </div>
            
            {/* Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái hiện tại:</span>
                {getStatusBadge(itemDetails.status)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Vị trí lưu trữ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {itemDetails.storage ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{itemDetails.storage.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {itemDetails.storage.location}
                  </span>
                </div>
                <Link
                  href={`/storages/${itemDetails.storage.id}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Xem chi tiết kho
                  <ChevronLeft className="h-3 w-3 rotate-180" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Chưa được phân bổ vào kho</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push(`/storages?assign=${itemDetails.id}`)}
                >
                  Phân bổ vào kho
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Thông tin phiếu nhập
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Số phiếu:</span>
              <Link
                href={`/shipments/${itemDetails.shipment.id}`}
                className="font-medium text-primary hover:underline"
              >
                {itemDetails.shipment.receiptNumber}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ngày nhập:</span>
              <span className="font-medium">
                {format(new Date(itemDetails.shipment.receiptDate), 'dd/MM/yyyy', { locale: vi })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nhà cung cấp:</span>
              <span className="font-medium">{itemDetails.shipment.supplierName}</span>
            </div>
          </CardContent>
        </Card>

        {/* Product Specifications */}
        {(itemDetails.product.colorName || itemDetails.product.weight || itemDetails.product.size ||
          itemDetails.product.thickness || itemDetails.product.material ||
          itemDetails.product.handleLength || itemDetails.product.handleCircumference) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Thông số kỹ thuật
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemDetails.product.colorName && (
                  <div className="flex items-start gap-3">
                    <Palette className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Màu sắc</p>
                      <p className="font-medium">{itemDetails.product.colorName}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.weight && (
                  <div className="flex items-start gap-3">
                    <Weight className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Trọng lượng</p>
                      <p className="font-medium">{itemDetails.product.weight}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.size && (
                  <div className="flex items-start gap-3">
                    <Ruler className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Kích thước</p>
                      <p className="font-medium">{itemDetails.product.size}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.thickness && (
                  <div className="flex items-start gap-3">
                    <Layers className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Độ dày</p>
                      <p className="font-medium">{itemDetails.product.thickness}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.material && (
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Chất liệu</p>
                      <p className="font-medium">{itemDetails.product.material}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.handleLength && (
                  <div className="flex items-start gap-3">
                    <Maximize2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Chiều dài cán</p>
                      <p className="font-medium">{itemDetails.product.handleLength}</p>
                    </div>
                  </div>
                )}
                
                {itemDetails.product.handleCircumference && (
                  <div className="flex items-start gap-3">
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Chu vi cán</p>
                      <p className="font-medium">{itemDetails.product.handleCircumference}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Lịch sử
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">Tạo mới</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(itemDetails.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </p>
                </div>
              </div>
              
              {itemDetails.scannedAt && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <QrCode className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Đã quét mã</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(itemDetails.scannedAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
