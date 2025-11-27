'use server';

import { db } from '~/server/db';
import { customers, orders } from '~/server/db/schema';
import { eq, desc, sql, and, gte, lte, or, ilike } from 'drizzle-orm';
import { logger } from '~/lib/logger';
import { requireAuth } from '~/lib/authorization';

interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  customerType: 'b2b' | 'b2c';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topSpenders: {
    id: string;
    name: string;
    phone: string;
    totalSpent: number;
  }[];
  averageOrderValue: number;
}

// Get list of customers with filtering and statistics
export async function getCustomersList(
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    sortBy?: 'name' | 'totalSpent' | 'totalOrders' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<ActionResult<{ customers: CustomerDetail[]; total: number }>> {
  try {
    await requireAuth();

    const {
      limit = 20,
      offset = 0,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build where conditions for customers
    const customerConditions = [];
    
    if (search) {
      customerConditions.push(
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.phone, `%${search}%`),
          ilike(customers.address, `%${search}%`)
        )
      );
    }
    
    if (startDate) {
      customerConditions.push(gte(customers.createdAt, startDate));
    }
    
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      customerConditions.push(lte(customers.createdAt, endOfDay));
    }

    const whereClause = customerConditions.length > 0 ? and(...customerConditions) : undefined;

    // Get total count of customers
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers);
    
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const totalResult = await countQuery;
    const total = totalResult[0]?.count ?? 0;

    let customersQuery = db
      .select({
        customer: customers,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::int`,
        lastOrderDate: sql<Date | null>`max(${orders.createdAt})`,
        customerType: sql<'b2b' | 'b2c'>`
          COALESCE(
            (SELECT customer_type 
             FROM orders o2 
             WHERE o2.customer_id = ${customers.id} 
             ORDER BY o2.created_at DESC 
             LIMIT 1),
            'b2c'
          )
        `,
      })
      .from(customers)
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .groupBy(customers.id)
      .$dynamic();
    
    if (whereClause) {
      customersQuery = customersQuery.where(whereClause);
    }

    // Apply sorting
    if (sortBy === 'name') {
      customersQuery = customersQuery.orderBy(
        sortOrder === 'desc' ? desc(customers.name) : customers.name
      );
    } else if (sortBy === 'totalSpent') {
      customersQuery = customersQuery.orderBy(
        sortOrder === 'desc' 
          ? desc(sql`coalesce(sum(${orders.totalAmount}), 0)`)
          : sql`coalesce(sum(${orders.totalAmount}), 0)`
      );
    } else if (sortBy === 'totalOrders') {
      customersQuery = customersQuery.orderBy(
        sortOrder === 'desc'
          ? desc(sql`count(distinct ${orders.id})`)
          : sql`count(distinct ${orders.id})`
      );
    } else {
      customersQuery = customersQuery.orderBy(
        sortOrder === 'desc' ? desc(customers.createdAt) : customers.createdAt
      );
    }
    
    const customersData = await customersQuery
      .limit(limit)
      .offset(offset);

    const customersList: CustomerDetail[] = customersData.map(data => ({
      id: data.customer.id,
      name: data.customer.name,
      phone: data.customer.phone,
      address: data.customer.address,
      customerType: data.customerType,
      totalOrders: data.orderCount,
      totalSpent: data.totalSpent,
      lastOrderDate: data.lastOrderDate,
      createdAt: data.customer.createdAt,
      updatedAt: data.customer.updatedAt,
    }));

    return {
      success: true,
      message: 'Đã tải danh sách khách hàng',
      data: {
        customers: customersList,
        total,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message }, 'Không có quyền xem danh sách khách hàng');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error fetching customers:');
    return {
      success: false,
      message: 'Lỗi khi tải danh sách khách hàng',
    };
  }
}

// Get customer statistics
export async function getCustomerStats(): Promise<ActionResult<CustomerStats>> {
  try {
    await requireAuth();

    // Get total customers
    const totalCustomersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers);
    const totalCustomers = totalCustomersResult[0]?.count ?? 0;

    // Get new customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customers)
      .where(gte(customers.createdAt, startOfMonth));
    const newCustomersThisMonth = newCustomersResult[0]?.count ?? 0;

    // Get top spenders
    const topSpendersData = await db
      .select({
        customer: customers,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::int`,
      })
      .from(customers)
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .groupBy(customers.id)
      .orderBy(desc(sql`coalesce(sum(${orders.totalAmount}), 0)`))
      .limit(5);

    const topSpenders = topSpendersData.map(data => ({
      id: data.customer.id,
      name: data.customer.name,
      phone: data.customer.phone,
      totalSpent: data.totalSpent,
    }));

    // Get average order value
    const avgOrderResult = await db
      .select({
        avgValue: sql<number>`coalesce(avg(${orders.totalAmount}), 0)::int`,
      })
      .from(orders);
    const averageOrderValue = avgOrderResult[0]?.avgValue ?? 0;

    return {
      success: true,
      message: 'Đã tải thống kê khách hàng',
      data: {
        totalCustomers,
        newCustomersThisMonth,
        topSpenders,
        averageOrderValue,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message }, 'Không có quyền xem thống kê khách hàng');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error fetching customer stats:');
    return {
      success: false,
      message: 'Lỗi khi tải thống kê khách hàng',
    };
  }
}

// Define proper type for order
interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  customerType: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  voucherCode: string | null;
  notes: string | null;
  processedBy: string | null;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get customer by ID with order history
export async function getCustomerById(customerId: string): Promise<ActionResult<CustomerDetail & { orders: OrderRecord[] }>> {
  try {
    await requireAuth();

    // Get customer with statistics
    const customerData = await db
      .select({
        customer: customers,
        orderCount: sql<number>`count(distinct ${orders.id})::int`,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)::int`,
        lastOrderDate: sql<Date | null>`max(${orders.createdAt})`,
        customerType: sql<'b2b' | 'b2c'>`
          COALESCE(
            (SELECT customer_type 
             FROM orders o2 
             WHERE o2.customer_id = ${customers.id} 
             ORDER BY o2.created_at DESC 
             LIMIT 1),
            'b2c'
          )
        `,
      })
      .from(customers)
      .leftJoin(orders, eq(customers.id, orders.customerId))
      .where(eq(customers.id, customerId))
      .groupBy(customers.id);

    if (customerData.length === 0 || !customerData[0]) {
      return {
        success: false,
        message: 'Không tìm thấy khách hàng',
      };
    }

    const data = customerData[0];

    // Get recent orders
    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    return {
      success: true,
      message: 'Đã tải thông tin khách hàng',
      data: {
        id: data.customer.id,
        name: data.customer.name,
        phone: data.customer.phone,
        address: data.customer.address,
        customerType: data.customerType,
        totalOrders: data.orderCount,
        totalSpent: data.totalSpent,
        lastOrderDate: data.lastOrderDate,
        createdAt: data.customer.createdAt,
        updatedAt: data.customer.updatedAt,
        orders: customerOrders as OrderRecord[],
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('quyền')) {
      logger.warn({ error: error.message, customerId }, 'Không có quyền xem thông tin khách hàng');
      return {
        success: false,
        message: error.message,
      };
    }

    logger.error({ error }, 'Error fetching customer:');
    return {
      success: false,
      message: 'Lỗi khi tải thông tin khách hàng',
    };
  }
}