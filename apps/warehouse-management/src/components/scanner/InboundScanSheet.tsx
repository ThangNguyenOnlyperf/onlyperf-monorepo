'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import QRScanner from './QRScanner';
import { scanItemAction, reconcileShipmentStatusAction } from '~/actions/scanActions';
import type { Storage } from '~/actions/storageActions';
import type { ShipmentWithItems } from '~/actions/shipmentActions';
import { CheckCircle2, X } from 'lucide-react';
import { playErrorTone, playSuccessTone } from '~/lib/audio-feedback';

interface InboundScanSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storages: Storage[];
  shipment?: ShipmentWithItems | null;
  onScanComplete?: () => void;
  onProgressUpdate?: () => void;
}

export default function InboundScanSheet({
  open,
  onOpenChange,
  storages,
  shipment,
  onScanComplete,
  onProgressUpdate,
}: InboundScanSheetProps) {
  const [selectedStorageId, setSelectedStorageId] = useState<string>('');
  const [autoAccept, setAutoAccept] = useState(true);
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const lastScanTime = useRef<number>(0);
  const lastScannedCode = useRef<string>('');
  const isProcessingScan = useRef<boolean>(false);
  const SCAN_DELAY = 2500;

  useEffect(() => {
    if (storages.length > 0 && !selectedStorageId) {
      const defaultStorage = storages.find((element) => element.capacity >= 0 && element.usedCapacity < element.capacity)
      if (defaultStorage) {
        setSelectedStorageId(defaultStorage.id);
      }
    }
  }, [storages]);
  
  const handleScan = useCallback(async (qrCode: string): Promise<void> => {
    const now = Date.now();
    
    if (isProcessingScan.current || 
      (now - lastScanTime.current) < SCAN_DELAY || 
      qrCode === lastScannedCode.current) {
        return;
      }
      
      isProcessingScan.current = true;
      lastScanTime.current = now;
      lastScannedCode.current = qrCode;
      
      try {
        if (!selectedStorageId) {
          setScanFeedback({ type: 'error', message: 'Vui lòng chọn kho trước khi quét' });
          void playErrorTone();
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
          return;
        }
        
        if (!autoAccept) {
          const selectedStorage = storages.find(s => s.id === selectedStorageId);
          const confirmed = confirm(
            `Xác nhận nhận sản phẩm này vào kho ${selectedStorage?.name}?`
          );
          if (!confirmed) {
            return;
          }
        }
        
        const result = await scanItemAction(qrCode, selectedStorageId);
        
        if (result.success && result.data) {
          const { item, isAlreadyReceived } = result.data;
          
          if (isAlreadyReceived) {
            setScanFeedback({ type: 'error', message: result.data.message });
            void playErrorTone();
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
          } else {
            setScanFeedback({ type: 'success', message: result.data.message });
            void playSuccessTone();
            if ('vibrate' in navigator) {
              navigator.vibrate(200);
            }
            
            setScannedItems(prev => new Set([...prev, item.qrCode]));
            onProgressUpdate?.();
            
            const newScannedCount = scannedItems.size + 1;
            if (shipment && newScannedCount === shipment.itemCount) {
              setScanFeedback({ type: 'success', message: 'Đã quét xong tất cả sản phẩm trong phiếu nhập!' });
              void reconcileShipmentStatusAction(shipment.id);
              setTimeout(() => onScanComplete?.(), 1500);
            }
          }
          
          setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        } else {
          setScanFeedback({ type: 'error', message: result.error ?? 'Lỗi khi quét sản phẩm' });
          void playErrorTone();
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
          setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
        }
      } catch (error) {
        console.error('Scan processing error:', error);
      } finally {
        setTimeout(() => {
          isProcessingScan.current = false;
        }, SCAN_DELAY);
      }
    }, [selectedStorageId, autoAccept, storages, scannedItems.size, shipment, onProgressUpdate, onScanComplete]);
    
    const handleError = useCallback((error: string) => {
      setScanFeedback({ type: 'error', message: error });
      setTimeout(() => setScanFeedback({ type: null, message: '' }), 2000);
    }, []);
    
    const totalItems = shipment?.itemCount ?? 0;
    const scannedCount = scannedItems.size;
    
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="inbound-scan-sheet"
        className="max-w-none w-full h-full p-0 m-0 flex flex-col"
        style={{ maxHeight: '100vh' }}
      >
        <DialogDescription id="inbound-scan-sheet" className="sr-only">
          Quét nhập kho
        </DialogDescription>
        <DialogTitle className="sr-only">Quét nhập kho</DialogTitle>
        <div className="absolute top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-lg font-semibold">Quét nhập kho</h2>
              <p className="text-sm text-muted-foreground">
                {shipment 
                  ? `Phiếu nhập ${shipment.receiptNumber}`
                  : 'Quét mã QR trên sản phẩm'
                }
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              size="icon"
              variant="ghost"
              className="rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="absolute top-16 left-0 right-0 h-[40vh] bg-black">
          <QRScanner
            onScan={handleScan}
            onError={handleError}
            className="h-full"
            externalFeedback={scanFeedback}
            disableInternalDelay={true}
            isOpen={open}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 top-[calc(16rem+20vh)] bg-background overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 pb-3 border-b">
              <div className="space-y-2">
                <Label htmlFor="storage" className="text-sm font-medium">Chọn kho</Label>
                <Select
                  value={selectedStorageId}
                  onValueChange={setSelectedStorageId}
                  disabled={isPending}
                >
                  <SelectTrigger id="storage" className="h-10">
                    <SelectValue placeholder="Chọn kho để nhập hàng" />
                  </SelectTrigger>
                  <SelectContent>
                    {storages.map((storage) => {
                      const utilizationRate = storage.capacity > 0 
                        ? Math.round((storage.usedCapacity / storage.capacity) * 100)
                        : 0;
                      const isFull = storage.usedCapacity >= storage.capacity;
                      
                      return (
                        <SelectItem 
                          key={storage.id} 
                          value={storage.id}
                          disabled={isFull}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{storage.name} - {storage.location}</span>
                            <span className={`text-sm ${isFull ? 'text-red-600' : 'text-muted-foreground'}`}>
                              ({storage.usedCapacity}/{storage.capacity} - {utilizationRate}%)
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-accept"
                  checked={autoAccept}
                  onCheckedChange={(checked) => setAutoAccept(checked as boolean)}
                  disabled={isPending}
                />
                <Label 
                  htmlFor="auto-accept" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Tự động xác nhận (không cần xác nhận cho mỗi sản phẩm)
                </Label>
              </div>
            </div>

            {shipment && totalItems > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Số lượng</span>
                  <span className="font-medium">
                    {scannedCount}/{totalItems} sản phẩm
                  </span>
                </div>
              </div>
            )}

            {scannedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Đã quét {scannedCount} sản phẩm</span>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1"
              >
                Đóng
              </Button>
              {shipment && totalItems === scannedCount && totalItems > 0 && (
                <Button
                  onClick={() => {
                    onScanComplete?.();
                    onOpenChange(false);
                  }}
                  className="flex-1"
                >
                  Hoàn thành
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}