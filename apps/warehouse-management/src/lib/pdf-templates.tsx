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

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 10, // 10mm margins
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  qrContainer: {
    width: '24%', // 4 columns
    marginBottom: 15,
    alignItems: 'center',
  },
  qrCode: {
    width: 42, // Approximately 1.5cm
    height: 42,
    marginBottom: 5,
  },
  qrLabel: {
    fontSize: 8,
    textAlign: 'center',
    maxWidth: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
  },
});

export interface QRCodeItem {
  id: string;
  code: string;
  qrCodeDataUrl: string;
  label: string;
}

export interface PDFTemplateProps {
  title: string;
  subtitle?: string;
  items: QRCodeItem[];
  generatedAt?: Date;
}

export const QRCodePDFTemplate: React.FC<PDFTemplateProps> = ({
  title,
  subtitle,
  items,
  generatedAt = new Date(),
}) => {
  // Split items into pages (24 per page - 4x6 grid)
  const itemsPerPage = 24;
  const pages = [];
  
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          {/* Header - only on first page */}
          {pageIndex === 0 && (
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          )}

          {/* QR Code Grid */}
          <View style={styles.grid}>
            {pageItems.map((item) => (
              <View key={item.id} style={styles.qrContainer}>
                <Image style={styles.qrCode} src={item.qrCodeDataUrl} />
                <Text style={styles.qrLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Trang {pageIndex + 1} / {pages.length} - Tạo lúc:{' '}
            {generatedAt.toLocaleString('vi-VN')}
          </Text>
        </Page>
      ))}
    </Document>
  );
};

// Alternative template for single large QR codes (e.g., for curved surfaces)
const largeStyles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  container: {
    alignItems: 'center',
    marginBottom: 30,
  },
  qrCode: {
    width: 120, // Larger size for curved surfaces
    height: 120,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  info: {
    fontSize: 10,
    color: '#666666',
  },
});

export const LargeQRCodePDFTemplate: React.FC<PDFTemplateProps> = ({
  title,
  items,
  generatedAt = new Date(),
}) => {
  // 4 large QR codes per page
  const itemsPerPage = 4;
  const pages = [];
  
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage));
  }

  return (
    <Document>
      {pages.map((pageItems, pageIndex) => (
        <Page key={pageIndex} size="A4" style={largeStyles.page}>
          {pageItems.map((item) => (
            <View key={item.id} style={largeStyles.container}>
              <Image style={largeStyles.qrCode} src={item.qrCodeDataUrl} />
              <Text style={largeStyles.label}>{item.code}</Text>
              <Text style={largeStyles.info}>{item.label}</Text>
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
};