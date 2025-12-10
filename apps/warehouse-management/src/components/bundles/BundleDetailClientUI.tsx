'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Progress } from '~/components/ui/progress';
import {
  Package,
  ArrowLeft,
  QrCode,
  Play,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  ShoppingCart,
  User,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteBundleAction, type BundleWithItems, type BundleStatus } from '~/actions/bundleActions';

interface BundleDetailClientUIProps {
  bundle: BundleWithItems;
}

const statusConfig: Record<BundleStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: 'Chờ xử lý',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: Clock,
  },
  assembling: {
    label: 'Đang lắp ráp',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
  },
  completed: {
    label: 'Hoàn thành',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
  },
  sold: {
    label: 'Đã bán',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: ShoppingCart,
  },
};

export default function BundleDetailClientUI({ bundle }: BundleDetailClientUIProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusInfo = statusConfig[bundle.status as BundleStatus];
  const StatusIcon = statusInfo?.icon ?? Package;

  const totalExpected = bundle.items.reduce((sum, item) => sum + item.expectedCount, 0);
  const totalScanned = bundle.items.reduce((sum, item) => sum + item.scannedCount, 0);
  const overallProgress = totalExpected > 0 ? Math.round((totalScanned / totalExpected) * 100) : 0;

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteBundleAction(bundle.id);
      if (result.success) {
        toast.success(result.message);
        router.push('/bundles');
      } else {
        toast.error(result.message);
      }
      setShowDeleteDialog(false);
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{bundle.name}</h1>
            <Badge className={`${statusInfo?.color ?? ''} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo?.label ?? bundle.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <QrCode className="h-4 w-4" />
            <span className="font-mono">{bundle.qrCode}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {bundle.status === 'pending' && (
            <>
              <Link href={`/bundles/${bundle.id}/assembly`}>
                <Button className="bg-gradient-to-r from-primary to-primary/80">
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu lắp ráp
                </Button>
              </Link>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            </>
          )}
          {bundle.status === 'assembling' && (
            <Link href={`/bundles/${bundle.id}/assembly`}>
              <Button className="bg-gradient-to-r from-blue-500 to-blue-600">
                <Play className="h-4 w-4 mr-2" />
                Tiếp tục lắp ráp
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tiến độ tổng thể
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Đã quét: {totalScanned}/{totalExpected}</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Items Progress */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 bg-muted/50">Pha</TableHead>
                  <TableHead className="bg-muted/50">Sản phẩm</TableHead>
                  <TableHead className="bg-muted/50">Tiến độ</TableHead>
                  <TableHead className="bg-muted/50 text-right">Đã quét</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.items.map((item, index) => {
                  const itemProgress = item.expectedCount > 0
                    ? Math.round((item.scannedCount / item.expectedCount) * 100)
                    : 0;
                  const isCurrentPhase = bundle.status === 'assembling' && index === bundle.currentPhaseIndex;
                  const isCompleted = item.scannedCount >= item.expectedCount;

                  return (
                    <TableRow
                      key={item.id}
                      className={`hover:bg-primary/5 ${isCurrentPhase ? 'bg-blue-50' : ''}`}
                    >
                      <TableCell>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isCurrentPhase
                            ? 'bg-blue-500 text-white animate-pulse'
                            : index === 0
                            ? 'bg-blue-100 text-blue-800'
                            : index === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {isCompleted ? '✓' : index + 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product?.name ?? '-'}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.product?.brand} - {item.product?.model}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress
                            value={itemProgress}
                            className={`h-2 ${isCompleted ? '[&>div]:bg-emerald-500' : ''}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.scannedCount}/{item.expectedCount}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bundle Info */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin lô hàng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ngày tạo:</span>
                <span>{formatDate(bundle.createdAt)}</span>
              </div>

              {bundle.createdByUser && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Người tạo:</span>
                  <span>{bundle.createdByUser.name}</span>
                </div>
              )}

              {bundle.assemblyStartedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Play className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bắt đầu:</span>
                  <span>{formatDate(bundle.assemblyStartedAt)}</span>
                </div>
              )}

              {bundle.assemblyCompletedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Hoàn thành:</span>
                  <span>{formatDate(bundle.assemblyCompletedAt)}</span>
                </div>
              )}

              {bundle.assembledByUser && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Người lắp ráp:</span>
                  <span>{bundle.assembledByUser.name}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-2">Thống kê</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{bundle.items.length}</div>
                  <div className="text-xs text-muted-foreground">Loại SP</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{totalExpected}</div>
                  <div className="text-xs text-muted-foreground">Tổng SP</div>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-700">{totalScanned}</div>
                  <div className="text-xs text-emerald-600">Đã quét</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{bundle._count.inventoryItems}</div>
                  <div className="text-xs text-blue-600">Trong kho</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa lô hàng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa lô hàng &quot;{bundle.name}&quot;? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
