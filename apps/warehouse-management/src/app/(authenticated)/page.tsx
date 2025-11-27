'use client';

import { useRouter } from 'next/navigation';
import {
  Package,
  FileText,
  ShoppingCart,
  Home,
  Users,
  Truck,
  PackageOpen,
  Plus,
  QrCode
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

export default function HomePage() {
  const router = useRouter();

  const navigationCards = [
    {
      title: 'Phiếu nhập',
      description: 'Quản lý phiếu nhập hàng vào kho',
      href: '/shipments',
      icon: FileText
    },
    {
      title: 'Đơn hàng',
      description: 'Theo dõi và xử lý đơn hàng',
      href: '/orders',
      icon: ShoppingCart
    },
    {
      title: 'Sản phẩm',
      description: 'Danh sách và thông tin sản phẩm',
      href: '/products',
      icon: Package
    },
    {
      title: 'Kho hàng',
      description: 'Quản lý tồn kho và vị trí lưu trữ',
      href: '/storages',
      icon: Home
    },
    {
      title: 'Khách hàng',
      description: 'Thông tin và lịch sử khách hàng',
      href: '/customers',
      icon: Users
    },
    {
      title: 'Giao hàng',
      description: 'Theo dõi trạng thái giao hàng',
      href: '/deliveries',
      icon: Truck
    },
    {
      title: 'Xử lý đơn Shopify',
      description: 'Quét QR để hoàn thành đơn hàng online',
      href: '/fulfillment',
      icon: QrCode
    },
    {
      title: 'Xuất kho',
      description: 'Xử lý xuất hàng từ kho',
      href: '/outbound',
      icon: PackageOpen
    },
    {
      title: 'Tạo phiếu nhập mới',
      description: 'Tạo phiếu nhập hàng mới',
      href: '/shipments/new',
      icon: Plus,
      special: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Hệ thống quản lý kho
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quản lý toàn diện quy trình nhập xuất kho, đơn hàng và giao vận của bạn
          </p>
        </div>

        {/* Navigation Cards - Clean Modern Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {navigationCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.href}
                  className="relative bg-primary/5 border-primary/10 hover:bg-primary/10 transition-all duration-200 cursor-pointer group overflow-hidden"
                  onClick={() => router.push(card.href)}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      {card.special && (
                        <span className="text-xs font-bold px-2 py-1 rounded-md bg-primary/15 text-primary">
                          Mới
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {card.title}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1.5 text-muted-foreground">
                        {card.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
