'use client';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { BadgeConfig } from '~/lib/badge-config-schema';

interface BadgeConfigFormProps {
  config: BadgeConfig;
  onChange: (updates: Partial<BadgeConfig>) => void;
}

export default function BadgeConfigForm({ config, onChange }: BadgeConfigFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Cấu hình trang in</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pageWidth">Chiều rộng (cm)</Label>
            <Input
              id="pageWidth"
              type="number"
              min="10"
              max="100"
              value={config.pageWidth}
              onChange={(e) => onChange({ pageWidth: parseFloat(e.target.value) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pageHeight">Chiều cao (cm)</Label>
            <Input
              id="pageHeight"
              type="number"
              min="10"
              max="150"
              value={config.pageHeight}
              onChange={(e) => onChange({ pageHeight: parseFloat(e.target.value) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-4">Cấu hình khoảng cách (pixels)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="margin">Lề trang</Label>
            <Input
              id="margin"
              type="number"
              min="0"
              max="200"
              value={config.margin}
              onChange={(e) => onChange({ margin: parseInt(e.target.value, 10) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gapX">Khoảng cách ngang</Label>
            <Input
              id="gapX"
              type="number"
              min="0"
              max="100"
              value={config.gapX}
              onChange={(e) => onChange({ gapX: parseInt(e.target.value, 10) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gapY">Khoảng cách dọc</Label>
            <Input
              id="gapY"
              type="number"
              min="0"
              max="100"
              value={config.gapY}
              onChange={(e) => onChange({ gapY: parseInt(e.target.value, 10) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-4">Cấu hình nâng cao</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dpi">DPI</Label>
            <Input
              id="dpi"
              type="number"
              min="72"
              max="600"
              step="50"
              value={config.dpi}
              onChange={(e) => onChange({ dpi: parseInt(e.target.value, 10) })}
              className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-xs text-muted-foreground">Khuyến nghị: 300 DPI</p>
          </div>
          {config.mode === 'badge' && (
            <div className="space-y-2">
              <Label htmlFor="badgeWidth">Chiều rộng badge (px)</Label>
              <Input
                id="badgeWidth"
                type="number"
                min="100"
                max="1000"
                value={config.badgeTargetWidth}
                onChange={(e) => onChange({ badgeTargetWidth: parseInt(e.target.value, 10) })}
                className="h-10 border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
