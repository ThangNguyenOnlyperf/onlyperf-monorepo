'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import NewShipmentForm from './NewShipmentForm';
import { type ShipmentFormData } from './ShipmentSchema';
import { createShipmentAction } from '~/actions/shipmentActions';
import { toast } from 'sonner';
import type { Product } from '~/lib/schemas/productSchema';
import type { Brand } from '~/lib/schemas/brandSchema';
import ProductCreateModal from './ProductCreateModal';
import ProviderCreateModal from './ProviderCreateModal';
import { getBrandsAction } from '~/actions/brandActions';
import type { Provider } from '~/actions/providerActions';
import type { Color } from '~/lib/schemas/colorSchema';

interface NewShipmentClientProps {
  products: Product[];
  providers: Provider[];
  colors?: Color[];
}

export default function NewShipmentClient({ 
  products: initialProducts,
  providers: initialProviders,
  colors = [],
}: NewShipmentClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [providers, setProviders] = useState<Provider[]>(initialProviders);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (data: ShipmentFormData) => {
    try {
      const result = await createShipmentAction(data);

      if (result.success && result.data) {
        toast.success(result.message ?? 'Phiếu nhập đã được tạo thành công!');
        setIsRedirecting(true);
        router.push(`/shipments/${result.data.shipmentId}/pdf`);
      } else {
        console.error('Server action failed:', result);
        toast.error(result.error ?? 'Không thể tạo phiếu nhập');
      }
    } catch (error) {
      console.error('Error creating shipment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Đã xảy ra lỗi: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Tạo lô hàng mới</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8 px-4">
        <NewShipmentForm 
          onSubmit={handleSubmit} 
          products={products}
          providers={providers}
          colors={colors}
          onCreateProduct={async () => {
            const brandsResult = await getBrandsAction();
            if (brandsResult.success && brandsResult.data) {
              setBrands(brandsResult.data);
            }
            setIsCreateModalOpen(true);
          }}
          onCreateProvider={() => {
            setIsProviderModalOpen(true);
          }}
        />
      </div>

      <ProductCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        brands={brands}
        colors={colors}
        onProductCreated={(newProduct: Product) => {
          // Optimistically add the new product to the list
          setProducts(prev => [...prev, newProduct]);
          toast.success('Sản phẩm mới đã được thêm vào danh sách');
        }}
      />

      <ProviderCreateModal
        open={isProviderModalOpen}
        onOpenChange={setIsProviderModalOpen}
        onProviderCreated={(newProvider: Provider) => {
          // Optimistically add the new provider to the list
          setProviders(prev => [...prev, newProvider]);
          toast.success('Nhà cung cấp mới đã được thêm vào danh sách');
        }}
      />

      {/* Loading overlay during redirect */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Đang tạo file PDF...</p>
            <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</p>
          </div>
        </div>
      )}
    </div>
  );
}
