import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { GroupedQRItemsWithDataUrl } from '~/actions/types';

// Register Vietnamese font with error handling
try {
  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-400-normal.woff',
        fontWeight: 'normal',
      },
      {
        src: 'https://unpkg.com/@fontsource/roboto@5.0.8/files/roboto-vietnamese-700-normal.woff',
        fontWeight: 'bold',
      },
    ],
  });
} catch (error) {
  console.error('Failed to register custom font, using default font:', error);
}

// Define styles for the grouped PDF
const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 30,
    borderBottom: '1px solid #cccccc',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Roboto',
  },
  groupContainer: {
    marginBottom: 25,
  },
  groupHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    padding: '5px 10px',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    fontFamily: 'Roboto',
  },
  qrGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  qrItem: {
    alignItems: 'center',
    marginRight: 25,
    marginBottom: 20,
  },
  qrCode: {
    width: 42,
    height: 42,
    marginBottom: 4,
  },
  qrLabel: {
    fontSize: 7,
    textAlign: 'center',
    maxWidth: 60, 
    fontFamily: 'Roboto',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
    borderTop: '1px solid #cccccc',
    paddingTop: 10,
    fontFamily: 'Roboto',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    fontSize: 10,
    fontFamily: 'Roboto',
    color: '#666666',
  },
});

export interface GroupedPDFTemplateProps {
  title: string;
  subtitle?: string;
  groupedItems: GroupedQRItemsWithDataUrl[];
  generatedAt?: Date;
}

export const GroupedQRCodePDFTemplate: React.FC<GroupedPDFTemplateProps> = ({
  title,
  subtitle,
  groupedItems,
  generatedAt = new Date(),
}) => {
  const ITEMS_PER_ROW = 5;
  const ROWS_PER_PAGE = 8;
  
  const pages: Array<{
    groups: Array<{
      brand: string;
      model: string;
      items: Array<{
        id: string;
        qrCode: string;
        qrCodeDataUrl: string;
      }>;
    }>;
  }> = [];
  
  let currentPage = { groups: [] as any[] };
  let currentPageItemCount = 0;
  
  for (const group of groupedItems) {
    const groupItemCount = group.items.length;
    const groupRowCount = Math.ceil(groupItemCount / ITEMS_PER_ROW);
    
    // Check if this group fits on current page
    if (currentPageItemCount > 0 && currentPageItemCount + groupRowCount > ROWS_PER_PAGE) {
      // Start new page
      pages.push(currentPage);
      currentPage = { groups: [] };
      currentPageItemCount = 0;
    }
    
    currentPage.groups.push(group);
    currentPageItemCount += groupRowCount + 1; // +1 for header
  }
  
  if (currentPage.groups.length > 0) {
    pages.push(currentPage);
  }

  return (
    <Document>
      {pages.map((page, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}

          {/* Grouped QR Codes */}
          {page.groups.map((group, groupIndex) => (
            <View key={`${pageIndex}-${groupIndex}`} style={styles.groupContainer}>
              <Text style={styles.groupHeader}>
                {group.brand}, {group.model}
              </Text>
              <View style={styles.qrGrid}>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.qrItem}>
                    <Image style={styles.qrCode} src={item.qrCodeDataUrl} />
                    <Text style={styles.qrLabel}>{item.qrCode}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Footer with page number */}
          <Text style={styles.pageNumber}>
            Trang {pageIndex + 1} / {pages.length}
          </Text>
          
          {/* Footer - only on last page */}
          {pageIndex === pages.length - 1 && (
            <Text style={styles.footer}>
              Tạo lúc: {generatedAt.toLocaleString('vi-VN')}
            </Text>
          )}
        </Page>
      ))}
    </Document>
  );
};