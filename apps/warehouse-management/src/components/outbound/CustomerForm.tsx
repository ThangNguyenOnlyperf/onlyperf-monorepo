'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { User, Phone, MapPin, CreditCard, Ticket, Building2, UserCircle, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import ProviderSelect from '~/components/shipments/ProviderSelect';
import CustomerPhoneCombobox from './CustomerPhoneCombobox';
import type { CustomerInfo } from './types';
import type { Provider } from '~/actions/providerActions';
import { type Customer } from '~/actions/customersAction';
import { toast } from 'sonner';

interface CustomerFormProps {
  customerInfo: CustomerInfo;
  onChange: (info: CustomerInfo) => void;
  providers: Provider[];
  onCreateProvider: () => void;
  customers: Customer[];
}

export default function CustomerForm({
  customerInfo,
  onChange,
  providers,
  onCreateProvider,
  customers
}: CustomerFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>();

  const handleChange = useCallback((field: keyof CustomerInfo, value: string) => {
    onChange({
      ...customerInfo,
      [field]: value
    });
  }, [customerInfo, onChange]);

  const handleCustomerTypeChange = (type: 'b2b' | 'b2c') => {
    onChange({
      ...customerInfo,
      customerType: type,
      providerId: type === 'b2c' ? undefined : customerInfo.providerId,
      name: type === 'b2c' ? '' : customerInfo.name,
      phone: type === 'b2c' ? '' : customerInfo.phone,
      address: type === 'b2c' ? '' : customerInfo.address,
    });
  };

  const handleCustomerSelect = (customer: Customer) => {
    onChange({
      ...customerInfo,
      name: customer.name,
      address: customer.address,
      phone: customer.phone
    });
    toast.success(`Đã chọn khách hàng: ${customer.name}`);
  };

  const handleCreateNewCustomer = () => {
    toast.info('Tính năng tạo khách hàng mới sẽ được triển khai sau');
  }

  const handleProviderSelect = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      onChange({
        ...customerInfo,
        providerId: provider.id,
        name: provider.name,
        phone: provider.telephone,
        address: provider.address ?? '',
      });
    }
  };
  return (
    <Card className="card-shadow bg-gradient-to-br from-purple-500/5 to-purple-600/5 border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Thông tin khách hàng
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Type Selection */}
        <Tabs value={customerInfo.customerType} onValueChange={(value) => handleCustomerTypeChange(value as 'b2b' | 'b2c')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="b2c" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Khách lẻ
            </TabsTrigger>
            <TabsTrigger value="b2b" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Doanh nghiệp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="b2b" className="space-y-4">
            {/* Provider Selection for B2B */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 ">
                <Building2 className="h-4 w-4" />
                Chọn nhà cung cấp/đại lý *
              </Label>
              <div className="flex gap-2 items-stretch">
                <div className="flex-1 max-w-full ">
                  <ProviderSelect
                    providers={providers}
                    value={customerInfo.providerId}
                    onValueChange={(value) => handleProviderSelect(value)}
                    placeholder="Chọn nhà cung cấp hoặc đại lý..."
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCreateProvider}
                  className="min-h-[44px] px-3 hover:scale-[1.02] active:scale-[0.98] flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedProvider && (
                <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p><strong>Tên:</strong> {selectedProvider.name}</p>
                  <p><strong>SĐT:</strong> {selectedProvider.telephone}</p>
                  {selectedProvider.taxCode && <p><strong>MST:</strong> {selectedProvider.taxCode}</p>}
                  {selectedProvider.address && <p><strong>Địa chỉ:</strong> {selectedProvider.address}</p>}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="b2c" className="space-y-4">
            {/* Phone Number for B2C with Customer Search */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Số điện thoại *
              </Label>
              <CustomerPhoneCombobox
                customers={customers}
                value={customerInfo.phone}
                onValueChange={(value) => handleChange('phone', value)}
                onCustomerSelect={handleCustomerSelect}
                onCreateNew={handleCreateNewCustomer}
              />
            </div>
            {/* Customer Name for B2C */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Họ và tên *
              </Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nhập họ và tên khách hàng"
                className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>


            {/* Address for B2C */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Địa chỉ
              </Label>
              <Textarea
                id="address"
                value={customerInfo.address ? customerInfo.address : ""}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Nhập địa chỉ giao hàng (tùy chọn)"
                className="min-h-[80px] border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Common Fields - Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Phương thức thanh toán
          </Label>
          <Select
            value={customerInfo.paymentMethod}
            onValueChange={(value) => handleChange('paymentMethod', value as 'cash' | 'bank_transfer')}
          >
            <SelectTrigger className="h-10 min-w-full border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Tiền mặt</SelectItem>
              <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Voucher Code */}
        <div className="space-y-2">
          <Label htmlFor="voucher" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Mã giảm giá
          </Label>
          <Input
            id="voucher"
            value={customerInfo.voucherCode}
            onChange={(e) => handleChange('voucherCode', e.target.value)}
            placeholder="Nhập mã giảm giá (nếu có)"
            className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          {customerInfo.voucherCode && (
            <p className="text-xs text-muted-foreground">
              * Tính năng mã giảm giá sẽ được triển khai trong tương lai
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}