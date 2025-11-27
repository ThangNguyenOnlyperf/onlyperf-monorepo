'use client';

import { useEffect, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import { GroupedQRCodePDFTemplate } from '~/lib/pdf-templates-grouped';
import type { GroupedQRItemsWithDataUrl } from '~/actions/types';
import type { BadgeConfig } from '~/lib/badge-config-schema';
import { generateBadgePDFAction } from '~/actions/badgeActions';
import type { BadgeItem } from '~/lib/badge-generator';
import { getQRBaseURL } from '~/lib/qr-generator';

interface PDFViewerProps {
  title: string;
  subtitle?: string;
  groupedItems: GroupedQRItemsWithDataUrl[];
  badgeConfig?: BadgeConfig;
  onPDFGenerated?: (blob: Blob) => void;
}

export default function PDFViewer({
  title,
  subtitle,
  groupedItems,
  badgeConfig,
  onPDFGenerated,
}: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void generatePDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedItems.length]); // Only re-generate when items count changes

  const generatePDF = async () => {
    try {
      setLoading(true);

      // Check if we should use badge mode or QR-only mode
      const useBadgeMode = badgeConfig?.mode === 'badge' && badgeConfig?.templateId;

      if (useBadgeMode && badgeConfig) {
        // Badge mode: use server-side badge generator
        await generateBadgePDF(badgeConfig);
      } else {
        // QR-only mode: use @react-pdf/renderer (current approach)
        await generateQROnlyPDF();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);

      if (error instanceof Error) {
        if (error.message.includes('DataView') || error.message.includes('font')) {
          toast.error('Lỗi tải font chữ. Đang thử lại với font mặc định...');
        } else {
          toast.error(`Không thể tạo PDF: ${error.message}`);
        }
      } else {
        toast.error('Đã xảy ra lỗi không xác định khi tạo PDF');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate PDF using @react-pdf/renderer (QR-only mode)
   */
  const generateQROnlyPDF = async () => {
    const doc = (
      <GroupedQRCodePDFTemplate
        title={title}
        subtitle={subtitle}
        groupedItems={groupedItems}
      />
    );

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
    onPDFGenerated?.(blob);
    toast.success('PDF đã được tạo thành công!');
  };

  /**
   * Generate PDF using badge generator (badge mode)
   */
  const generateBadgePDF = async (config: BadgeConfig) => {
    // Convert grouped items to badge items
    const badgeItems: BadgeItem[] = [];
    const baseUrl = getQRBaseURL();

    for (const group of groupedItems) {
      for (const item of group.items) {
        badgeItems.push({
          id: item.id,
          shortCode: item.qrCode,
          url: `${baseUrl}/p/${item.qrCode}`,
        });
      }
    }

    // Call server action to generate badge PDF
    const result = await generateBadgePDFAction(badgeItems, config);

    if (!result.success || !result.data) {
      throw new Error(result.error ?? 'Failed to generate badge PDF');
    }

    // Convert base64 to blob
    const binaryString = atob(result.data.pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    setPdfUrl(url);
    onPDFGenerated?.(blob);
    toast.success(`PDF tem nhãn đã được tạo thành công! (${result.data.totalBadges} tem)`);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tạo PDF...</p>
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-600">Không thể tạo PDF</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[800px]">
      <iframe
        src={pdfUrl}
        className="w-full h-full min-h-[800px] border-0"
        title="PDF Preview"
      />
    </div>
  );
}
