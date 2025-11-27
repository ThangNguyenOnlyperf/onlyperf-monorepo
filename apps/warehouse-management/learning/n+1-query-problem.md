# N+1 Query Problem: Case Study & Detection Guide

## What is the N+1 Query Problem?

The N+1 query problem occurs when you:
1. Execute **1 query** to fetch a list of items (e.g., 10 orders)
2. Then execute **N additional queries** (one per item) to fetch related data
3. Result: **N+1 total queries** instead of 2-3 optimized queries

**Example:** Fetching 10 orders with their items = 1 query for orders + 10 queries for items = **11 queries**

---

## 🚨 How to Smell Bad SQL (Detection Checklist)

### 1. **Look for Loops with Database Queries**
```typescript
// 🔴 RED FLAG: Query inside a loop
for (const order of orders) {
  const items = await db.select()...  // ❌ BAD!
}
```

### 2. **Check Promise.all with .map(async)**
```typescript
// 🔴 RED FLAG: Each iteration makes a query
await Promise.all(
  deliveries.map(async (d) => {
    const items = await db.select()...  // ❌ BAD!
  })
);
```

### 3. **Count Your Queries**
- If you have **10 items** in your result
- And you're making **10+ database calls**
- You have an N+1 problem

### 4. **Look at Query Location**
```typescript
// ✅ GOOD: Queries BEFORE the loop
const allOrders = await db.select()...
const allItems = await db.select().where(inArray(...))  // Batch fetch

// ❌ BAD: Queries INSIDE the loop
for (const order of orders) {
  const items = await db.select().where(eq(orderId, order.id))
}
```

---

## Real Case Studies from Our Codebase

### Case 1: Orders List Page

#### 🔴 BEFORE (Bad - N+1 Problem)
```typescript
// orderActions.ts - Lines 410-465
const ordersData = await db.select()...  // 1 query

const ordersList = [];
for (const data of ordersData) {  // 🚨 LOOP!
  // Query for each order
  const itemList = await db
    .select()
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, data.order.id));  // ❌ N queries

  ordersList.push({ ...data, items: itemList });
}
```

**Problem:** 20 orders = 1 + 20 = **21 queries**

**Why it's slow:**
- Each query has overhead (connection, parsing, execution)
- 20 round trips to database
- Joins executed 20 times instead of once

#### ✅ AFTER (Good - Optimized)
```typescript
// 1. Fetch orders once
const ordersData = await db.select()
  .from(orders)
  .leftJoin(customers, ...)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))  // Join here!
  .groupBy(orders.id, customers.id, ...)  // Aggregate

// 2. Use COUNT aggregation instead of fetching all items
const query = db.select({
  order: orders,
  customer: customers,
  itemCount: sql<number>`COALESCE(count(${orderItems.id}), 0)::int`  // ✅ Count only
})
```

**Result:** 20 orders = **2 queries** (1 count + 1 data)

**Performance:** ~91% reduction in queries

---

### Case 2: Fulfillment Page

#### 🔴 BEFORE (Bad)
```typescript
const pendingOrders = await db.select()...  // 1 query

for (const order of pendingOrders) {  // 🚨 LOOP!
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.orderId));  // ❌ N queries
}
```

**Problem:** 10 orders = **11 queries**

#### ✅ AFTER (Good)
```typescript
// 1. Fetch orders
const pendingOrders = await db.select()...

// 2. Fetch ALL items in ONE query
const orderIds = pendingOrders.map(o => o.orderId);
const allItems = await db
  .select()
  .from(orderItems)
  .where(inArray(orderItems.orderId, orderIds));  // ✅ Batch fetch

// 3. Group in memory (fast!)
const itemsByOrderId = new Map();
for (const item of allItems) {
  if (!itemsByOrderId.has(item.orderId)) {
    itemsByOrderId.set(item.orderId, []);
  }
  itemsByOrderId.get(item.orderId).push(item);
}

// 4. Build final result
const result = pendingOrders.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.orderId) || []
}));
```

**Result:** 10 orders = **2 queries**

**Performance:** ~82% reduction in queries

---

### Case 3: Deliveries Page

#### 🔴 BEFORE (Bad - Double N+1!)
```typescript
const deliveries = await db.select()...  // 1 query

const result = await Promise.all(
  deliveries.map(async (d) => {
    // ❌ N queries for items
    const items = await db.select()
      .where(eq(orderItems.orderId, d.order.id));

    // ❌ N queries for resolutions
    const resolution = await db.select()
      .where(eq(deliveryResolutions.deliveryId, d.delivery.id));

    return { ...d, items, resolution };
  })
);
```

**Problem:** 10 deliveries = 1 + 10 + 10 = **21 queries**

#### ✅ AFTER (Good - Batch Everything)
```typescript
// 1. Fetch deliveries
const deliveries = await db.select()...

// 2. Batch fetch items
const orderIds = deliveries.map(d => d.order.id);
const allItems = await db.select()
  .where(inArray(orderItems.orderId, orderIds));

// 3. Batch fetch resolutions
const deliveryIds = deliveries.map(d => d.delivery.id);
const allResolutions = await db.select()
  .where(inArray(deliveryResolutions.deliveryId, deliveryIds));

// 4. Group both in memory
const itemsByOrderId = groupBy(allItems, 'orderId');
const resolutionByDeliveryId = groupBy(allResolutions, 'deliveryId');

// 5. Combine
const result = deliveries.map(d => ({
  ...d,
  items: itemsByOrderId.get(d.order.id) || [],
  resolution: resolutionByDeliveryId.get(d.delivery.id) || null
}));
```

**Result:** 10 deliveries = **3 queries**

**Performance:** ~86% reduction in queries

---

## SQL Optimization Patterns

### Pattern 1: Use COUNT for List Views
```sql
-- ❌ BAD: Fetch all data when you only need count
SELECT items.* FROM items WHERE order_id = ?

-- ✅ GOOD: Use aggregation
SELECT
  orders.*,
  COUNT(items.id) as item_count
FROM orders
LEFT JOIN items ON orders.id = items.order_id
GROUP BY orders.id
```

### Pattern 2: Use IN/ANY for Batch Queries
```sql
-- ❌ BAD: One query per ID
SELECT * FROM items WHERE order_id = 'order1'
SELECT * FROM items WHERE order_id = 'order2'
SELECT * FROM items WHERE order_id = 'order3'

-- ✅ GOOD: Single query with IN
SELECT * FROM items
WHERE order_id IN ('order1', 'order2', 'order3')
-- or with Drizzle: inArray(items.orderId, orderIds)
```

### Pattern 3: Use JOINs Wisely
```sql
-- ❌ BAD: Fetch separately
SELECT * FROM orders WHERE id = ?
SELECT * FROM customers WHERE id = ?
SELECT * FROM items WHERE order_id = ?

-- ✅ GOOD: JOIN in single query
SELECT
  orders.*,
  customers.name,
  COUNT(items.id) as item_count
FROM orders
LEFT JOIN customers ON orders.customer_id = customers.id
LEFT JOIN items ON orders.id = items.order_id
WHERE orders.id = ?
GROUP BY orders.id, customers.id
```

---

## Quick Detection Questions

Before writing database code, ask yourself:

1. **Am I looping through results?**
   - If YES → Are there database calls inside? → 🚨

2. **How many queries will this execute?**
   - 10 items = 10+ queries? → 🚨

3. **Can I fetch this in a batch?**
   - Use `inArray()`, `IN`, or `ANY` → ✅

4. **Do I need all this data?**
   - List view only needs counts? Use `COUNT()` → ✅

5. **Am I using Promise.all correctly?**
   - With `.map(async (item) => db.query())`? → 🚨
   - With independent operations? → ✅

---

## Performance Impact

| Pattern | 10 Items | 100 Items | 1000 Items |
|---------|----------|-----------|------------|
| N+1 Queries | 11 queries | 101 queries | 1001 queries |
| Optimized | 2 queries | 2 queries | 2 queries |
| **Improvement** | **82%** | **98%** | **99.8%** |

---

## Tools to Help Detect N+1

### 1. Database Query Logging
```typescript
// Enable query logging in Drizzle
const db = drizzle(pool, {
  logger: true  // Shows all SQL queries
});
```

### 2. Performance Monitoring
```typescript
console.time('fetchOrders');
const orders = await getOrdersList();
console.timeEnd('fetchOrders');
// If slow → check query count
```

### 3. Database Explain
```sql
EXPLAIN ANALYZE
SELECT orders.*, COUNT(items.id)
FROM orders
LEFT JOIN items ON orders.id = items.order_id
GROUP BY orders.id;
```

---

## Action Items After Reading This

✅ **Audit your code for these patterns:**
1. Search for: `for (const` + `await db`
2. Search for: `Promise.all` + `.map(async`
3. Search for: `.where(eq(` inside loops

✅ **Fix using these techniques:**
1. Move queries outside loops
2. Use `inArray()` for batch fetching
3. Use `COUNT()` when full data isn't needed
4. Group results in memory after batch fetch

✅ **Verify improvements:**
1. Count queries before/after
2. Measure execution time
3. Test with larger datasets

---

## Summary

**Bad SQL smells like:**
- 🔴 Queries inside loops
- 🔴 N queries for N items
- 🔴 Multiple round trips to DB
- 🔴 Repeated joins

**Good SQL smells like:**
- ✅ Batch queries with IN/ANY
- ✅ Aggregations (COUNT, SUM)
- ✅ Single JOINs
- ✅ Memory grouping after fetch

**Remember:** The database is fast at processing data in bulk. Use it!

---

*Case study from warehouse-management system optimization (2025-11-05)*
