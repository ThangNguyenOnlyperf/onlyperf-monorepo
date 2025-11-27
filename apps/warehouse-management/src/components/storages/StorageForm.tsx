'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { StorageSchema, type StorageFormData } from './StorageSchema';

interface StorageFormProps {
  defaultValues?: Partial<StorageFormData>;
  onSubmit: (data: StorageFormData) => void;
  isPending?: boolean;
}

const defaultEmptyValues: StorageFormData = {
  name: '',
  location: '',
  capacity: 100,
  priority: 0,
};

export default function StorageForm({
  defaultValues,
  onSubmit,
  isPending = false,
}: StorageFormProps) {
  const form = useForm<StorageFormData>({
    resolver: zodResolver(StorageSchema),
    defaultValues: {
      ...defaultEmptyValues,
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Tên kho</FormLabel>
              <FormControl>
                <Input
                  placeholder="VD: Kho A1"
                  {...field}
                  disabled={isPending}
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription>
                Tên định danh cho kho hàng
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Vị trí</FormLabel>
              <FormControl>
                <Input
                  placeholder="VD: Tầng 1, Dãy A"
                  {...field}
                  disabled={isPending}
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription>
                Mô tả vị trí của kho trong nhà xưởng
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Sức chứa</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="100"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={isPending}
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription>
                Số lượng sản phẩm tối đa kho có thể chứa
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Độ ưu tiên</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  max="100"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={isPending}
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription>
                Độ ưu tiên từ 0-100 (cao hơn sẽ hiển thị trước)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {defaultValues ? 'Cập nhật' : 'Tạo kho'}
          </Button>
        </div>
      </form>
    </Form>
  );
}