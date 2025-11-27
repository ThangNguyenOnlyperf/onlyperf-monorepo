'use client';

import { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useBadgeConfig } from '~/hooks/useBadgeConfig';
import BadgeTemplateSelector from './BadgeTemplateSelector';
import BadgeConfigForm from './BadgeConfigForm';
import { toast } from 'sonner';

interface BadgeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
}

export default function BadgeConfigModal({
  open,
  onOpenChange,
  onConfirm,
}: BadgeConfigModalProps) {
  const { config, updateConfig, resetConfig, isLoaded } = useBadgeConfig();
  const [activeTab, setActiveTab] = useState('template');

  const handleTemplateSelect = (templateId: string | null) => {
    updateConfig({
      templateId,
      mode: templateId ? 'badge' : 'qr-only',
    });
  };

  const handleReset = () => {
    resetConfig();
    toast.success('Đã khôi phục cấu hình mặc định');
  };

  const handleConfirm = () => {
    toast.success('Đã lưu cấu hình tem nhãn');
    onConfirm?.();
    onOpenChange(false);
  };

  if (!isLoaded) {
    return null; // Don't render until config is loaded from localStorage
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Cấu hình in tem nhãn
          </DialogTitle>
          <DialogDescription>
            Tùy chỉnh cách in QR code và tem nhãn cho sản phẩm
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Mẫu tem nhãn</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-6">
            <BadgeTemplateSelector
              selectedTemplateId={config.templateId}
              onSelect={handleTemplateSelect}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <BadgeConfigForm config={config} onChange={updateConfig} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2 btn-secondary"
          >
            <RotateCcw className="h-4 w-4" />
            Khôi phục mặc định
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="btn-secondary"
            >
              Hủy
            </Button>
            <Button onClick={handleConfirm} className="btn-primary">
              Xác nhận
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
