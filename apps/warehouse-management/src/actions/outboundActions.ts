'use server';

import { db } from '~/server/db';
import { shipmentItems, products, customers, orders, orderItems } from '~/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { ActionResult } from './types';
import type { OrderData, ScannedProduct } from '~/components/outbound/types';
import { generateOrderExcel } from '~/lib/excel-export/orderExport';
import { auth } from '~/lib/auth';
import { headers } from 'next/headers';
import { queueInventorySync } from '~/lib/shopify/inventory';
import { logger, getUserContext } from '~/lib/logger';

export async function updateProductPrice(productId: string, price: number): Promise<ActionResult> {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    logger.warn('Unauthorized attempt to update product price');
    return {
      success: false,
      message: 'Bạn cần đăng nhập để cập nhật giá sản phẩm'
    };
  }

  const userContext = getUserContext(session);

  try {
    const [oldProduct] = await db
      .select({ name: products.name, price: products.price })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!oldProduct) {
      logger.warn({ productId }, 'Không tìm thấy sản phẩm để cập nhật giá');
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm'
      };
    }

    logger.info({
      ...userContext,
      productId,
      productName: oldProduct.name,
      oldPrice: oldProduct.price,
      newPrice: price
    }, `User ${userContext.userName} đang cập nhật giá sản phẩm`);

    await db
      .update(products)
      .set({
        price: price,
        updatedAt: new Date()
      })
      .where(eq(products.id, productId));

    logger.info({
      ...userContext,
      productId,
      productName: oldProduct.name,
      oldPrice: oldProduct.price,
      newPrice: price
    }, `User ${userContext.userName} đã cập nhật giá sản phẩm thành công`);

    return {
      success: true,
      message: 'Đã cập nhật giá sản phẩm'
    };
  } catch (error) {
    logger.error({ ...userContext, error, productId }, `User ${userContext.userName} gặp lỗi khi cập nhật giá sản phẩm`);
    return {
      success: false,
      message: 'Không thể cập nhật giá sản phẩm'
    };
  }
}

export async function validateAndFetchItem(qrCode: string): Promise<ActionResult<ScannedProduct>> {
  try {
    logger.info({ qrCode }, 'Bắt đầu xác thực sản phẩm qua mã QR');

    let productCode = qrCode;
    if (qrCode.includes('/p/')) {
      const parts = qrCode.split('/p/');
      productCode = parts[parts.length - 1] ?? qrCode;
    }

    const item = await db
      .select({
        shipmentItemId: shipmentItems.id,
        productId: shipmentItems.productId,
        status: shipmentItems.status,
        storageId: shipmentItems.storageId,
        qrCode: shipmentItems.qrCode,
        productName: products.name,
        brand: products.brand,
        model: products.model,
        price: products.price,
      })
      .from(shipmentItems)
      .leftJoin(products, eq(shipmentItems.productId, products.id))
      .where(eq(shipmentItems.qrCode, productCode))
      .limit(1);

    if (item.length === 0) {
      logger.warn({ qrCode, productCode }, 'Không tìm thấy sản phẩm với mã QR này');
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm với mã QR này'
      };
    }

    const product = item[0];

    if (!product) {
      logger.warn({ qrCode, productCode }, 'Không tìm thấy sản phẩm với mã QR này (product is null)');
      return {
        success: false,
        message: 'Không tìm thấy sản phẩm với mã QR này'
      };
    }

    // Allow 'received' (in-store) and 'allocated' (Shopify orders awaiting fulfillment)
    if (product.status !== 'received' && product.status !== 'allocated') {
      logger.warn({
        qrCode,
        productCode,
        shipmentItemId: product.shipmentItemId,
        productName: product.productName,
        status: product.status
      }, `Sản phẩm không khả dụng để bán - Trạng thái: ${product.status}`);
      return {
        success: false,
        message: `Sản phẩm không khả dụng để bán (Trạng thái: ${product.status})`
      };
    }

    logger.info({
      shipmentItemId: product.shipmentItemId,
      productId: product.productId,
      productName: product.productName,
      qrCode: product.qrCode,
      status: product.status,
      price: product.price
    }, 'Xác thực sản phẩm thành công');

    return {
      success: true,
      message: 'Sản phẩm hợp lệ',
      data: {
        shipmentItemId: product.shipmentItemId,
        productId: product.productId,
        productName: product.productName ?? '',
        brand: product.brand ?? '',
        model: product.model ?? '',
        qrCode: product.qrCode,
        price: product.price ?? 0,
        status: product.status,
        storageId: product.storageId
      }
    };
  } catch (error) {
    logger.error({ error, qrCode }, 'Lỗi khi xác thực sản phẩm');
    return {
      success: false,
      message: 'Lỗi khi kiểm tra sản phẩm: ' + qrCode
    };
  }
}

export async function processOrder(orderData: OrderData): Promise<ActionResult<{ orderId: string; orderNumber: string; excelUrl?: string }>> {
  // Get the current user session
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    logger.warn('Unauthenticated order processing attempt');
    return {
      success: false,
      message: 'Bạn cần đăng nhập để xử lý đơn hàng'
    };
  }

  const userId = session.user.id;
  const userContext = getUserContext(session);

  try {
    logger.info({
      ...userContext,
      customerPhone: orderData.customerInfo.phone,
      itemCount: orderData.cartItems.length,
      totalAmount: orderData.totalAmount,
    }, `User ${userContext.userName} processing outbound order`);

    const productIdsForSync = Array.from(new Set(orderData.cartItems.map(item => item.productId)));

    const result = await db.transaction(async (tx) => {
      const itemIds = orderData.cartItems.map(item => item.shipmentItemId);
      const currentItems = await tx
        .select({
          id: shipmentItems.id,
          status: shipmentItems.status,
        })
        .from(shipmentItems)
        .where(inArray(shipmentItems.id, itemIds));

      const unavailableItems = currentItems.filter(item => item.status !== 'received');
      if (unavailableItems.length > 0) {
        throw new Error(`${unavailableItems.length} sản phẩm không còn khả dụng`);
      }

      let customerId: string;
      const existingCustomer = await tx
        .select()
        .from(customers)
        .where(eq(customers.phone, orderData.customerInfo.phone))
        .limit(1);

      if (existingCustomer.length > 0 && existingCustomer[0]) {
        customerId = existingCustomer[0].id;
        await tx
          .update(customers)
          .set({
            name: orderData.customerInfo.name,
            address: orderData.customerInfo.address || existingCustomer[0].address,
            updatedAt: new Date()
          })
          .where(eq(customers.id, customerId));
      } else {
        customerId = nanoid();
        await tx.insert(customers).values({
          id: customerId,
          name: orderData.customerInfo.name,
          phone: orderData.customerInfo.phone,
          address: orderData.customerInfo.address || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      const orderNumber = generateOrderNumber();

      const orderId = nanoid();
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerId,
        providerId: orderData.customerInfo.providerId ?? null,
        customerType: orderData.customerInfo.customerType ?? 'b2c',
        source: 'in-store', // In-store sales via QR scanning
        totalAmount: orderData.totalAmount,
        paymentMethod: orderData.customerInfo.paymentMethod,
        paymentStatus: orderData.customerInfo.paymentMethod === 'cash' ? 'Paid' : 'Unpaid',
        voucherCode: orderData.customerInfo.voucherCode || null,
        notes: null,
        processedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const orderItemsData = orderData.cartItems.map(item => ({
        id: nanoid(),
        orderId,
        shipmentItemId: item.shipmentItemId,
        productId: item.productId,
        quantity: 1,
        price: item.price,
        qrCode: item.qrCode,
        createdAt: new Date()
      }));

      await tx.insert(orderItems).values(orderItemsData);

      await tx
        .update(shipmentItems)
        .set({
          status: 'sold'
        })
        .where(inArray(shipmentItems.id, itemIds));

      let excelData: { excelData: string; fileName: string } | undefined;
      try {
        const { buffer, fileName } = await generateOrderExcel({
          orderNumber,
          customerInfo: orderData.customerInfo,
          items: orderData.cartItems,
          totalAmount: orderData.totalAmount,
          processedBy: session.user.name || session.user.email,
          createdAt: new Date()
        });
        // Convert buffer to base64
        const base64Data = buffer.toString('base64');
        excelData = { excelData: base64Data, fileName };
      } catch (error) {
        logger.error({ error }, 'Error generating Excel');
      }

      return {
        success: true,
        message: `Đơn hàng ${orderNumber} đã được xử lý thành công`,
        data: {
          orderId,
          orderNumber,
          excelData
        }
      };
    });

    if (result.success && productIdsForSync.length > 0) {
      queueInventorySync(productIdsForSync);
    }

    logger.info({
      ...userContext,
      orderId: result.data?.orderId,
      orderNumber: result.data?.orderNumber,
      customerPhone: orderData.customerInfo.phone,
      itemCount: orderData.cartItems.length,
    }, `User ${userContext.userName} completed outbound order ${result.data?.orderNumber}`);

    return result;
  } catch (error) {
    logger.error({ ...userContext, error, customerPhone: orderData.customerInfo.phone }, `User ${userContext.userName} failed to process outbound order`);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Lỗi khi xử lý đơn hàng'
    };
  }
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `ORD-${year}${month}${day}-${random}`;
}
