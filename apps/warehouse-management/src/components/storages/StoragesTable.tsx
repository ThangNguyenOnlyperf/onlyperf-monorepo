'use client';

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Package,
  MapPin,
  TrendingUp
} from 'lucide-react';
import type { Storage } from '~/actions/storageActions';

interface StoragesTableProps {
  storages: Storage[];
  onEdit: (storage: Storage) => void;
  onDelete: (storage: Storage) => void;
}

export default function StoragesTable({
  storages,
  onEdit,
  onDelete,
}: StoragesTableProps) {
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUtilizationProgress = (used: number, capacity: number) => {
    const percentage = capacity > 0 ? (used / capacity) * 100 : 0;
    return {
      percentage,
      color: getUtilizationColor(percentage),
    };
  };

  if (storages.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Chưa có kho nào được tạo</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border card-shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-muted/50 first:rounded-tl-md">Tên kho</TableHead>
            <TableHead className="bg-muted/50">Vị trí</TableHead>
            <TableHead className="bg-muted/50">Sức chứa</TableHead>
            <TableHead className="bg-muted/50">Đã sử dụng</TableHead>
            <TableHead className="bg-muted/50">Tỷ lệ sử dụng</TableHead>
            <TableHead className="bg-muted/50">Độ ưu tiên</TableHead>
            <TableHead className="bg-muted/50 last:rounded-tr-md text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {storages.map((storage) => {
            const utilization = getUtilizationProgress(
              storage.usedCapacity,
              storage.capacity
            );

            return (
              <TableRow key={storage.id} className="hover:bg-primary/5 transition-all duration-200">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {storage.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {storage.location}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{storage.capacity}</span>
                </TableCell>
                <TableCell>
                  <span className={utilization.color}>
                    {storage.usedCapacity}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress 
                      value={utilization.percentage} 
                      className="h-2 flex-1"
                    />
                    <span className={`text-sm font-medium ${utilization.color}`}>
                      {Math.round(utilization.percentage)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={storage.priority > 50 ? "default" : "secondary"}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {storage.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                      >
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(storage)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete(storage)}
                        className="text-red-600"
                        disabled={storage.usedCapacity > 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa kho
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}