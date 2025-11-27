'use client';

import dynamic from 'next/dynamic';

const ShipmentTemplatePDFClient = dynamic(
  () => import('./ShipmentTemplatePDFClient'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Đang khởi tạo...
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Vui lòng đợi trong giây lát
            </p>
          </div>
        </div>
      </div>
    ),
  }
);

export default ShipmentTemplatePDFClient;
