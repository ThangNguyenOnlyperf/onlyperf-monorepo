import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { User, Phone, MapPin, Building2 } from 'lucide-react';

interface OrderCustomerInfoProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
  provider?: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  } | null;
  customerType: string;
}

export default function OrderCustomerInfo({ customer, provider, customerType }: OrderCustomerInfoProps) {
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Thông tin khách hàng
          </span>
          <Badge variant={customerType === 'b2b' ? 'default' : 'secondary'}>
            {customerType === 'b2b' ? 'B2B' : 'B2C'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{customer.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm">{customer.phone}</p>
            </div>
          </div>
          
          {customer.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{customer.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Provider Info for B2B */}
        {customerType === 'b2b' && provider && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Nhà cung cấp/Đại lý</span>
              </div>
              
              <div className="pl-6 space-y-1">
                <p className="text-sm font-medium">{provider.name}</p>
                <p className="text-sm text-muted-foreground">{provider.phone}</p>
                {provider.address && (
                  <p className="text-sm text-muted-foreground">{provider.address}</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}