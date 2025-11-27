'use client';

import { useState, useEffect, useTransition, useRef, useCallback } from 'react';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ScanLine, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '~/lib/auth-client';
import { useRouter } from 'next/navigation';
import OutboundScanner from './OutboundScanner';
import CartItemsList from './CartItemsList';
import CustomerForm from './CustomerForm';
import OrderSummary from './OrderSummary';
import ProviderModal from './ProviderModal';
import { processOrder } from '~/actions/outboundActions';
import { getProvidersAction } from '~/actions/providerActions';
import {
  getOrCreateUserSession,
  updateSessionCart,
  updateSessionCustomer,
  syncSessionData,
  clearUserSession,
  pingSession,
} from '~/actions/outboundSessionActions';
import type { CartItem, CustomerInfo, OrderData } from './types';
import type { Provider } from '~/actions/providerActions';
import { getCustomer, type Customer } from '~/actions/customersAction';


export default function OutboundClientUI() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cash',
    voucherCode: '',
    customerType: 'b2c',
    providerId: undefined
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [scannedItemIds, setScannedItemIds] = useState<Set<string>>(new Set());
  const [providers, setProviders] = useState<Provider[]>([]);
  
  // Session sync state
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>();
  const [deviceCount, setDeviceCount] = useState(1);
  const lastUpdateRef = useRef<Date | undefined>(undefined);
  const syncIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const deviceIdRef = useRef<string | undefined>(undefined);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Generate device ID on mount
  useEffect(() => {
    if (!deviceIdRef.current) {
      const storedId = localStorage.getItem('device-id');
      if (storedId) {
        deviceIdRef.current = storedId;
      } else {
        deviceIdRef.current = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('device-id', deviceIdRef.current);
      }
    }
  }, []);

  useEffect(() => {
    const getCustomers = async () => {
      const result = await getCustomer();
      if (result.success && result.data.length > 0) {
        setCustomers(result.data as Customer[]);
      }
    };
    getCustomers();
  }, []);

  // Load providers on mount
  useEffect(() => {
    const loadProviders = async () => {
      const result = await getProvidersAction();
      if (result.success && result.data) {
        setProviders(result.data);
      }
    };
    loadProviders();
  }, []);

  // Initialize session and start syncing
  useEffect(() => {
    if (!session?.user) return;

    const initSession = async () => {
      try {
        setIsSyncing(true);
        const result = await getOrCreateUserSession();
        
        if (result.success && result.data) {
          setIsConnected(true);
          
          // Load session data
          if (result.data.cartItems.length > 0) {
            setCartItems(result.data.cartItems);
            const ids = new Set<string>(result.data.cartItems.map(item => item.id));
            setScannedItemIds(ids);
          }
          
          if (result.data.customerInfo.name || result.data.customerInfo.phone) {
            setCustomerInfo(result.data.customerInfo);
          }
          
          lastUpdateRef.current = result.data.lastUpdated;
          setLastSyncTime(new Date());
          setDeviceCount(result.data.deviceCount);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
        setIsConnected(false);
      } finally {
        setIsSyncing(false);
      }
    };

    initSession();
  }, [session]);

  // Sync polling effect
  useEffect(() => {
    if (!session?.user || !isConnected) return;

    const syncData = async () => {
      try {
        const result = await syncSessionData(lastUpdateRef.current);
        
        if (result.success && result.data) {
          // Only update if there are changes
          if (result.data.lastUpdated > (lastUpdateRef.current ?? new Date(0))) {
            setIsSyncing(true);
            
            // Merge cart items (union of both)
            const currentIds = new Set(cartItems.map(item => item.id));
            const remoteIds = new Set(result.data.cartItems.map(item => item.id));
            const mergedItems = [
              ...cartItems,
              ...result.data.cartItems.filter(item => !currentIds.has(item.id))
            ];
            
            if (mergedItems.length !== cartItems.length) {
              setCartItems(mergedItems);
              setScannedItemIds(new Set(mergedItems.map(item => item.id)));
            }
            
            // Update customer info (last write wins)
            if (JSON.stringify(result.data.customerInfo) !== JSON.stringify(customerInfo)) {
              setCustomerInfo(result.data.customerInfo);
            }
            
            lastUpdateRef.current = result.data.lastUpdated;
            setLastSyncTime(new Date());
            setIsSyncing(false);
          }
        }
        
        // Ping to track active devices
        if (deviceIdRef.current) {
          const pingResult = await pingSession(deviceIdRef.current);
          if (pingResult.success && pingResult.data) {
            setDeviceCount(pingResult.data.deviceCount);
          }
        }
      } catch (error) {
        console.error('Sync error:', error);
        setIsConnected(false);
      }
    };

    // Initial sync
    syncData();

    // Set up polling interval (2 seconds)
    syncIntervalRef.current = setInterval(syncData, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [session, isConnected, cartItems, customerInfo]);

  // Update session when cart changes
  const updateCartInSession = useCallback(async (items: CartItem[]) => {
    if (!session?.user || !isConnected) return;
    
    try {
      const result = await updateSessionCart(items);
      if (result.success && result.data) {
        lastUpdateRef.current = result.data.lastUpdated;
      }
    } catch (error) {
      console.error('Error updating session cart:', error);
    }
  }, [session, isConnected]);

  // Update session when customer info changes
  const updateCustomerInSession = useCallback(async (info: CustomerInfo) => {
    if (!session?.user || !isConnected) return;
    
    try {
      const result = await updateSessionCustomer(info);
      if (result.success && result.data) {
        lastUpdateRef.current = result.data.lastUpdated;
      }
    } catch (error) {
      console.error('Error updating session customer:', error);
    }
  }, [session, isConnected]);

  const handleAddToCart = (item: CartItem) => {
    if (scannedItemIds.has(item.id)) {
      toast.error('Sản phẩm đã được quét');
      return false;
    }

    const newItems = [...cartItems, item];
    setCartItems(newItems);
    setScannedItemIds(prev => new Set([...prev, item.id]));
    updateCartInSession(newItems);
    toast.success(`Đã thêm ${item.productName} vào giỏ hàng`);
    return true;
  };

  const handleRemoveFromCart = (itemId: string) => {
    const item = cartItems.find(i => i.id === itemId);
    if (item) {
      const newItems = cartItems.filter(i => i.id !== itemId);
      setCartItems(newItems);
      setScannedItemIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
      updateCartInSession(newItems);
      toast.info(`Đã xóa ${item.productName} khỏi giỏ hàng`);
    }
  };

  const handleClearCart = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ giỏ hàng?')) {
      setCartItems([]);
      setScannedItemIds(new Set());
      updateCartInSession([]);
      toast.info('Đã xóa giỏ hàng');
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price, 0);
  };

  const handleProcessOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    if (customerInfo.customerType === 'b2b' && !customerInfo.providerId) {
      toast.error('Vui lòng chọn nhà cung cấp/đại lý cho giao dịch B2B');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Vui lòng nhập thông tin khách hàng');
      return;
    }

    if (customerInfo.voucherCode) {
      toast.error('Mã voucher không hợp lệ');
      return;
    }

    startTransition(async () => {
      const orderData: OrderData = {
        cartItems,
        customerInfo,
        totalAmount: calculateTotal()
      };

      const result = await processOrder(orderData);
      
      if (result.success && result.data) {
        // Clear local state first
        setCartItems([]);
        setScannedItemIds(new Set());
        const resetInfo: CustomerInfo = {
          name: '',
          phone: '',
          address: '',
          paymentMethod: 'cash',
          voucherCode: '',
          customerType: 'b2c',
          providerId: undefined
        };
        setCustomerInfo(resetInfo);
        
        // Clear session
        if (session?.user) {
          await clearUserSession();
        }
        
        // Show success message
        toast.success(result.message);
        
        // Redirect to order detail page
        router.push(`/orders/${result.data.orderId}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  // Update customer info with session sync
  const handleCustomerInfoChange = (info: CustomerInfo) => {
    setCustomerInfo(info);
    updateCustomerInSession(info);
  };
  return (
    <div className="space-y-4">
      {/* Sync Indicator */}
      {/* TODO: Hide for now */}
      {/* {session?.user && (
        <SyncIndicator
          isConnected={isConnected}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          deviceCount={deviceCount}
          className="sticky top-4 z-10"
        />
      )} */}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left side - Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Giỏ hàng ({cartItems.length} sản phẩm)
            </h2>
            <div className="flex gap-2">
              {cartItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCart}
                  className="hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Xóa tất cả
                </Button>
              )}
              <Button
                onClick={() => setIsScannerOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:scale-[1.02] active:scale-[0.98] button-shine"
              >
                <ScanLine className="h-4 w-4 mr-2" />
                Quét QR
              </Button>
            </div>
          </div>

          <CartItemsList 
            items={cartItems} 
            onRemove={handleRemoveFromCart}
          />
        </Card>
      </div>

      {/* Right side - Customer Info & Order Summary */}
      <div className="space-y-4">
        <CustomerForm
          customerInfo={customerInfo}
          onChange={handleCustomerInfoChange}
          providers={providers}
          onCreateProvider={() => setIsProviderModalOpen(true)}
          customers={customers}
        />
        
        <OrderSummary
          items={cartItems}
          total={calculateTotal()}
          onConfirm={handleProcessOrder}
          isPending={isPending}
        />
      </div>

      {/* Scanner Sheet */}
      <OutboundScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAddToCart={handleAddToCart}
        scannedItemIds={scannedItemIds}
      />

      {/* Provider Creation Modal */}
      <ProviderModal
        open={isProviderModalOpen}
        onOpenChange={setIsProviderModalOpen}
        onProviderCreated={(provider) => {
          setProviders(prev => [...prev, provider]);
          handleCustomerInfoChange({
            ...customerInfo,
            providerId: provider.id,
            name: provider.name,
            phone: provider.telephone,
            address: provider.address ?? ''
          });
        }}
      />
      </div>
    </div>
  );
}