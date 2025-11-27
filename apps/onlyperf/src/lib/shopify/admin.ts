import { env } from "@/env";

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

const ADMIN_ENDPOINT = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

async function adminGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
) {
  const response = await fetch(ADMIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Shopify Admin API error: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (payload.errors?.length) {
    const messages = payload.errors.map((error) => error.message).join("; ");
    throw new Error(`Shopify Admin API GraphQL error: ${messages}`);
  }

  if (!payload.data) {
    throw new Error("Shopify Admin API did not return data");
  }

  return payload.data;
}

interface OrderCreateResult {
  orderCreate: {
    order: {
      id: string;
      name: string;
      confirmed: boolean;
      displayFinancialStatus: string;
    } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
}

const ORDER_CREATE_MUTATION = /* GraphQL */ `
  mutation CreateOrder($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
    orderCreate(order: $order, options: $options) {
      order {
        id
        name
        confirmed
        displayFinancialStatus
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface OrderCreateOptions {
  /** Whether to send an order confirmation email to the customer */
  sendReceipt?: boolean;
  /** Whether to send a shipping confirmation email to the customer */
  sendFulfillmentReceipt?: boolean;
}

/**
 * Shopify Admin API: OrderCreateDiscountCodeInput
 * Only one type of discount can be applied to an order.
 * @see https://shopify.dev/docs/api/admin-graphql/latest/input-objects/OrderCreateDiscountCodeInput
 */
export interface OrderCreateDiscountCodeInput {
  /** A fixed amount discount code applied to the line items on the order */
  itemFixedDiscountCode?: {
    code: string;
    amountSet: {
      shopMoney: { amount: string; currencyCode: string };
    };
  };
  /** A percentage discount code applied to the line items on the order */
  itemPercentageDiscountCode?: {
    code: string;
    percentage: number;
  };
  /** A free shipping discount code applied to the shipping on an order */
  freeShippingDiscountCode?: {
    code: string;
  };
}

/**
 * Build discount code input for Shopify Admin API order creation.
 * Uses itemFixedDiscountCode since cart already calculated the discount amount.
 *
 * @param code - The discount code string
 * @param amountInCents - The discount amount in cents (e.g., 50000 for 500.00 VND)
 * @param currency - The currency code (default: "VND")
 * @returns OrderCreateDiscountCodeInput or undefined if no valid discount
 */
export function buildDiscountCodeInput(
  code: string | undefined,
  amountInCents: number | undefined,
  currency = "VND",
): OrderCreateDiscountCodeInput | undefined {
  if (!code || !amountInCents || amountInCents <= 0) {
    return undefined;
  }

  return {
    itemFixedDiscountCode: {
      code,
      amountSet: {
        shopMoney: {
          amount: (amountInCents / 100).toString(), // Convert from cents to decimal
          currencyCode: currency,
        },
      },
    },
  };
}

export async function createAdminOrder(
  order: Record<string, unknown>,
  options?: OrderCreateOptions,
) {
  const result = await adminGraphQL<OrderCreateResult>(ORDER_CREATE_MUTATION, {
    order,
    options,
  });

  const { order: createdOrder, userErrors } = result.orderCreate;

  if (userErrors.length > 0) {
    const message = userErrors
      .map(
        (error) =>
          `${error.message}${error.field ? ` (${error.field.join(".")})` : ""}`,
      )
      .join("; ");
    throw new Error(`Shopify orderCreate failed: ${message}`);
  }

  if (!createdOrder) {
    throw new Error("Shopify orderCreate did not return an order");
  }

  return createdOrder;
}

interface OrderMarkAsPaidResult {
  orderMarkAsPaid: {
    order: {
      id: string;
      displayFinancialStatus: string;
    } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
}

const ORDER_MARK_AS_PAID_MUTATION = /* GraphQL */ `
  mutation MarkAsPaid($id: ID!) {
    orderMarkAsPaid(input: { id: $id }) {
      order {
        id
        displayFinancialStatus
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function markAdminOrderAsPaid(id: string) {
  const result = await adminGraphQL<OrderMarkAsPaidResult>(
    ORDER_MARK_AS_PAID_MUTATION,
    { id },
  );

  const { order, userErrors } = result.orderMarkAsPaid;

  if (userErrors.length > 0) {
    const message = userErrors
      .map(
        (error) =>
          `${error.message}${error.field ? ` (${error.field.join(".")})` : ""}`,
      )
      .join("; ");
    throw new Error(`Shopify orderMarkAsPaid failed: ${message}`);
  }

  if (!order) {
    throw new Error("Shopify orderMarkAsPaid did not return an order");
  }

  return order;
}

export { adminGraphQL };
