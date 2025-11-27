'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { toast } from 'sonner';
import { ColorSchema, type ColorFormData } from '~/lib/schemas/colorSchema';
import { createColorAction } from '~/actions/colorActions';

interface ColorFormProps {
  onCreated?: (color: { id: string; name: string; hex: string }) => void;
}

export default function ColorForm({ onCreated }: ColorFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ColorFormData>({
    resolver: zodResolver(ColorSchema),
    defaultValues: {
      name: '',
      hex: '#',
    },
  });

  const onSubmit = (data: ColorFormData) => {
    startTransition(async () => {
      const res = await createColorAction(data);
      if (res.success && res.data) {
        toast.success(res.message || 'Đã tạo màu');
        onCreated?.({ id: res.data.id, name: res.data.name, hex: res.data.hex });
      } else {
        toast.error(res.error || 'Không thể tạo màu');
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Tên màu</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="VD: Đỏ, Xanh Dương"
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hex"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Mã màu</FormLabel>
              <FormControl>
                <div className="flex items-center gap-3">
                  {/* Native color picker */}
                  <input
                    type="color"
                    value={field.value && /^#/.test(field.value) ? field.value : '#FFFFFF'}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      field.onChange(v);
                    }}
                    className="h-10 w-10 cursor-pointer rounded-md border bg-transparent p-1"
                    aria-label="Chọn màu"
                  />
                  {/* Hex input (manual) */}
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    placeholder="#FF0000"
                    maxLength={7}
                    className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Đang lưu...' : 'Lưu màu'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
