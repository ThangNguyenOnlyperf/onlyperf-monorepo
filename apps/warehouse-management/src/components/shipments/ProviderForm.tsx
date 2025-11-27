'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import type { Provider, CreateProviderInput } from '~/actions/providerActions';

const ProviderFormSchema = z.object({
  type: z.enum(['supplier', 'retailer', 'seller']),
  name: z.string().min(1, 'Tên là bắt buộc'),
  telephone: z.string().min(1, 'Số điện thoại là bắt buộc'),
  taxCode: z.string().optional(),
  address: z.string().optional(),
  accountNo: z.string().optional(),
}).refine((data) => {
  // Validate required fields based on type
  if (data.type === 'supplier' || data.type === 'retailer') {
    return data.taxCode && data.taxCode.length > 0 && data.address && data.address.length > 0;
  }
  return true;
}, {
  message: 'Mã số thuế và địa chỉ là bắt buộc cho nhà cung cấp/đại lý',
  path: ['taxCode'], // This will show the error on taxCode field
});

type ProviderFormData = z.infer<typeof ProviderFormSchema>;

interface ProviderFormProps {
  defaultValues?: Partial<Provider>;
  onSubmit: (data: CreateProviderInput) => Promise<void>;
  isPending?: boolean;
}

export default function ProviderForm({ 
  defaultValues, 
  onSubmit,
  isPending = false
}: ProviderFormProps) {
  const form = useForm<ProviderFormData>({
    resolver: zodResolver(ProviderFormSchema),
    defaultValues: {
      type: defaultValues?.type as 'supplier' | 'retailer' | 'seller' || 'supplier',
      name: defaultValues?.name || '',
      telephone: defaultValues?.telephone || '',
      taxCode: defaultValues?.taxCode || '',
      address: defaultValues?.address || '',
      accountNo: defaultValues?.accountNo || '',
    },
  });

  const watchType = form.watch('type');
  const showAdditionalFields = watchType === 'supplier' || watchType === 'retailer';

  const handleSubmit = async (data: ProviderFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Loại nhà cung cấp *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-10 border-2 hover:border-primary/30 focus:border-primary">
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="supplier">Nhà cung cấp</SelectItem>
                  <SelectItem value="retailer">Đại lý</SelectItem>
                  <SelectItem value="seller">Người bán</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Tên *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={
                    watchType === 'seller' 
                      ? 'Nhập tên người bán' 
                      : 'Nhập tên công ty'
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telephone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Số điện thoại *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Nhập số điện thoại"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showAdditionalFields && (
          <>
            <FormField
              control={form.control}
              name="taxCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Mã số thuế *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Nhập mã số thuế"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Địa chỉ *</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="min-h-[80px] border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Nhập địa chỉ"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Số tài khoản</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Nhập số tài khoản (tùy chọn)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isPending}
            className="btn-secondary"
          >
            Đặt lại
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? 'Đang xử lý...' : defaultValues ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </Form>
  );
}