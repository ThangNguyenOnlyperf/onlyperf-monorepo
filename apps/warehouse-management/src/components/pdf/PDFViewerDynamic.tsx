'use client';

import dynamic from 'next/dynamic';
import type { GroupedQRItemsWithDataUrl } from '~/actions/types';
import type { BadgeConfig } from '~/lib/badge-config-schema';

interface PDFViewerProps {
  title: string;
  subtitle?: string;
  groupedItems: GroupedQRItemsWithDataUrl[];
  badgeConfig?: BadgeConfig;
  onPDFGenerated?: (blob: Blob) => void;
}

// Loading component
const PDFViewerLoading = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Đang tải PDF viewer...</p>
    </div>
  </div>
);

// Dynamically import PDFViewer with no SSR
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => <PDFViewerLoading />,
});

export default function PDFViewerDynamic(props: PDFViewerProps) {
  return <PDFViewer {...props} />;
}
