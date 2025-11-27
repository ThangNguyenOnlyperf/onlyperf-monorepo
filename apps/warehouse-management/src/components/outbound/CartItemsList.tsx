'use client';

import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Trash2, Package, QrCode } from 'lucide-react';
import type { CartItem } from './types';

interface CartItemsListProps {
  items: CartItem[];
  onRemove: (itemId: string) => void;
}

export default function CartItemsList({ items, onRemove }: CartItemsListProps) {
  const groupedItems = items.reduce((acc, item) => {
    const key = `${item.brand}-${item.model}`;
    if (!acc[key]) {
      acc[key] = {
        brand: item.brand,
        model: item.model,
        productName: item.productName,
        price: item.price,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, {
    brand: string;
    model: string;
    productName: string;
    price: number;
    items: CartItem[];
  }>);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Giỏ hàng trống</p>
        <p className="text-sm mt-2">Quét mã QR sản phẩm để thêm vào giỏ hàng</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([key, group]) => (
        <Card 
          key={key} 
          className="p-4 bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-500/20 hover:scale-[1.01] transition-all duration-200"
        >
          <div className="flex flex-col md:flex-row items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">
                {group.productName}
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {group.brand}
                </span>
                <span>{group.model}</span>
              </div>
              
              {/* Individual items with QR codes */}
              <div className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 bg-background/50 rounded-md"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <QrCode className="h-4 w-4 text-muted-foreground" />
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.qrCode}
                      </code>
                    </div>
                    <Badge >
                      {formatPrice(item.price)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(item.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div> 
            
            <div className="text-start md:text-right ml-0 md:ml-4">
              <p className="text-sm text-muted-foreground">
                Số lượng sản phẩm: {group.items.length}
              </p>
              <p className="text-lg font-semibold mt-1">
                {formatPrice(group.items.reduce((sum, item) => sum + item.price, 0))}
              </p>
            </div>
          </div>
        </Card>
      ))}
      
      <div className="border-t pt-4 mt-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Tổng cộng:</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {formatPrice(items.reduce((sum, item) => sum + item.price, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}