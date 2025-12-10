'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Package, Plus, Trash2, Loader2, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { createBundleAction, type BundleItemInput } from '~/actions/bundleActions';

interface Product {
  id: string;
  name: string;
  brand: string;
  model: string;
  packSize: number | null;
}

interface BundleItemRow extends BundleItemInput {
  product: Product;
}

interface CreateBundleClientUIProps {
  products: Product[];
}

export default function CreateBundleClientUI({ products }: CreateBundleClientUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [items, setItems] = useState<BundleItemRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [expectedCount, setExpectedCount] = useState<string>('');

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('Vui lòng chọn sản phẩm');
      return;
    }

    const count = parseInt(expectedCount, 10);
    if (isNaN(count) || count < 1) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if product already added
    if (items.some(item => item.productId === selectedProductId)) {
      toast.error('Sản phẩm này đã được thêm vào lô hàng');
      return;
    }

    const newItem: BundleItemRow = {
      productId: selectedProductId,
      expectedCount: count,
      phaseOrder: items.length,
      product,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setExpectedCount('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // Recalculate phase order
    setItems(newItems.map((item, i) => ({ ...item, phaseOrder: i })));
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newItems[index];
    const swapItem = newItems[swapIndex];
    if (temp && swapItem) {
      newItems[index] = swapItem;
      newItems[swapIndex] = temp;
    }

    // Recalculate phase order
    setItems(newItems.map((item, i) => ({ ...item, phaseOrder: i })));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên lô hàng');
      return;
    }

    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    startTransition(async () => {
      const result = await createBundleAction({
        name: name.trim(),
        items: items.map(item => ({
          productId: item.productId,
          expectedCount: item.expectedCount,
          phaseOrder: item.phaseOrder,
        })),
      });

      if (result.success) {
        toast.success(result.message);
        router.push('/bundles');
      } else {
        toast.error(result.message);
      }
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.expectedCount, 0);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bundle Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin lô hàng</CardTitle>
            <CardDescription>Nhập tên và thêm sản phẩm vào lô hàng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Tên lô hàng</Label>
              <Input
                id="name"
                placeholder="VD: Lô hàng sỉ 150 bóng"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Add Product */}
            <div className="space-y-2">
              <Label>Thêm sản phẩm</Label>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Chọn sản phẩm" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                        {product.packSize && ` (${product.packSize} quả)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  placeholder="SL"
                  className="w-20"
                  value={expectedCount}
                  onChange={(e) => setExpectedCount(e.target.value)}
                />
                <Button onClick={handleAddItem} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Thứ tự thêm sản phẩm sẽ là thứ tự các pha lắp ráp
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sản phẩm trong lô ({items.length} loại)
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                Tổng: {totalItems} sản phẩm
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có sản phẩm nào</p>
                <p className="text-sm">Thêm sản phẩm từ danh sách bên trái</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 bg-muted/50">Pha</TableHead>
                    <TableHead className="bg-muted/50">Sản phẩm</TableHead>
                    <TableHead className="bg-muted/50 text-right">Số lượng</TableHead>
                    <TableHead className="bg-muted/50 w-24">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.productId} className="hover:bg-primary/5">
                      <TableCell>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0
                            ? 'bg-blue-100 text-blue-800'
                            : index === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {index + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.product.brand} - {item.product.model}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.expectedCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMoveItem(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMoveItem(index, 'down')}
                            disabled={index === items.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleCreate}
          disabled={isPending || !name.trim() || items.length === 0}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tạo...
            </>
          ) : (
            <>
              <Package className="h-4 w-4 mr-2" />
              Tạo lô hàng
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
