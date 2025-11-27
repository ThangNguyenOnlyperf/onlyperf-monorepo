import ExcelJS from 'exceljs';
import type { CartItem, CustomerInfo } from '~/components/outbound/types';

interface OrderExcelData {
  orderNumber: string;
  customerInfo: CustomerInfo;
  items: CartItem[];
  totalAmount: number;
  processedBy: string;
  createdAt: Date;
}

export async function generateOrderExcel(data: OrderExcelData): Promise<{ buffer: Buffer; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Đơn hàng');

  worksheet.columns = [
    { width: 5 },  // STT
    { width: 20 }, // Mã QR
    { width: 30 }, // Tên sản phẩm
    { width: 15 }, // Thương hiệu
    { width: 15 }, // Model
    { width: 8 },  // SL
    { width: 15 }, // Đơn giá
    { width: 15 }, // Thành tiền
  ];

  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'CÔNG TY TNHH WAREHOUSE MANAGEMENT';
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = 'HÓA ĐƠN BÁN HÀNG';
  worksheet.getCell('A2').font = { bold: true, size: 14 };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.getCell('A4').value = 'Số đơn hàng:';
  worksheet.getCell('B4').value = data.orderNumber;
  worksheet.getCell('B4').font = { bold: true };

  worksheet.getCell('E4').value = 'Ngày:';
  worksheet.getCell('F4').value = data.createdAt.toLocaleDateString('vi-VN');

  worksheet.getCell('A5').value = 'Nhân viên:';
  worksheet.getCell('B5').value = data.processedBy;

  worksheet.getCell('A7').value = 'THÔNG TIN KHÁCH HÀNG';
  worksheet.getCell('A7').font = { bold: true };
  worksheet.mergeCells('A7:H7');
  worksheet.getCell('A7').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  worksheet.getCell('A8').value = 'Họ tên:';
  worksheet.getCell('B8').value = data.customerInfo.name;
  worksheet.getCell('E8').value = 'Điện thoại:';
  worksheet.getCell('F8').value = data.customerInfo.phone;

  worksheet.getCell('A9').value = 'Địa chỉ:';
  worksheet.mergeCells('B9:H9');
  worksheet.getCell('B9').value = data.customerInfo.address || 'N/A';

  worksheet.getCell('A10').value = 'Thanh toán:';
  worksheet.getCell('B10').value = data.customerInfo.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản';

  const headerRow = 12;
  const headers = ['STT', 'Mã QR', 'Tên sản phẩm', 'Thương hiệu', 'Model', 'SL', 'Đơn giá', 'Thành tiền'];
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  let currentRow = headerRow + 1;
  data.items.forEach((item, index) => {
    worksheet.getCell(currentRow, 1).value = index + 1;
    worksheet.getCell(currentRow, 2).value = item.qrCode;
    worksheet.getCell(currentRow, 3).value = item.productName;
    worksheet.getCell(currentRow, 4).value = item.brand;
    worksheet.getCell(currentRow, 5).value = item.model;
    worksheet.getCell(currentRow, 6).value = 1;
    worksheet.getCell(currentRow, 7).value = item.price;
    worksheet.getCell(currentRow, 7).numFmt = '#,##0 ₫';
    worksheet.getCell(currentRow, 8).value = item.price;
    worksheet.getCell(currentRow, 8).numFmt = '#,##0 ₫';

    for (let col = 1; col <= 8; col++) {
      worksheet.getCell(currentRow, col).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
    currentRow++;
  });

  currentRow++;
  worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'TỔNG CỘNG:';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
  worksheet.getCell(`A${currentRow}`).font = { bold: true };
  worksheet.getCell(`H${currentRow}`).value = data.totalAmount;
  worksheet.getCell(`H${currentRow}`).numFmt = '#,##0 ₫';
  worksheet.getCell(`H${currentRow}`).font = { bold: true, size: 12 };
  worksheet.getCell(`H${currentRow}`).border = {
    top: { style: 'double' },
    bottom: { style: 'double' }
  };

  currentRow += 3;
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = 'KHÁCH HÀNG';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  worksheet.getCell(`A${currentRow}`).font = { bold: true };

  worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = 'NHÂN VIÊN BÁN HÀNG';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
  worksheet.getCell(`E${currentRow}`).font = { bold: true };

  currentRow++;
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  worksheet.getCell(`A${currentRow}`).value = '(Ký, ghi rõ họ tên)';
  worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  worksheet.getCell(`A${currentRow}`).font = { italic: true, size: 10 };

  worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
  worksheet.getCell(`E${currentRow}`).value = '(Ký, ghi rõ họ tên)';
  worksheet.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
  worksheet.getCell(`E${currentRow}`).font = { italic: true, size: 10 };

  currentRow += 2;
  const signatureHeight = 5;
  
  for (let i = 0; i < signatureHeight; i++) {
    worksheet.mergeCells(`A${currentRow + i}:D${currentRow + i}`);
    const cell = worksheet.getCell(`A${currentRow + i}`);
    if (i === 0) {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    } else if (i === signatureHeight - 1) {
      cell.border = {
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    } else {
      cell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  for (let i = 0; i < signatureHeight; i++) {
    worksheet.mergeCells(`E${currentRow + i}:H${currentRow + i}`);
    const cell = worksheet.getCell(`E${currentRow + i}`);
    if (i === 0) {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    } else if (i === signatureHeight - 1) {
      cell.border = {
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    } else {
      cell.border = {
        left: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  const fileName = `order-${data.orderNumber}-${Date.now()}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  
  return { 
    buffer: Buffer.from(buffer), 
    fileName 
  };
}