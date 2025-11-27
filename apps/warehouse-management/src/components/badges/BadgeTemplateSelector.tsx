'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { Card } from '~/components/ui/card';
import { BADGE_TEMPLATES, type BadgeTemplate } from '~/lib/badge-config-schema';

interface BadgeTemplateSelectorProps {
  selectedTemplateId: string | null | undefined;
  onSelect: (templateId: string | null) => void;
}

export default function BadgeTemplateSelector({
  selectedTemplateId,
  onSelect,
}: BadgeTemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Chọn mẫu tem nhãn</h3>
        <p className="text-sm text-muted-foreground">
          Chọn "Chỉ QR" để in QR đơn giản hoặc chọn mẫu tem để nhúng QR vào tem nhãn
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* QR Only Option */}
        <Card
          className={`relative p-4 cursor-pointer transition-all border-2 hover:border-primary/50 ${
            !selectedTemplateId ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onClick={() => onSelect(null)}
        >
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2">
            <div className="w-24 h-24 bg-white dark:bg-black p-2 rounded">
              <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300"></div>
            </div>
          </div>
          <p className="text-sm font-medium text-center">Chỉ QR</p>
          {!selectedTemplateId && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          )}
        </Card>

        {/* Badge Templates */}
        {BADGE_TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className={`relative p-4 cursor-pointer transition-all border-2 hover:border-primary/50 ${
              selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onClick={() => onSelect(template.id)}
          >
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
              <Image
                src={template.path}
                alt={template.name}
                width={200}
                height={200}
                className="object-contain"
              />
            </div>
            <p className="text-sm font-medium text-center">{template.name}</p>
            {selectedTemplateId === template.id && (
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
