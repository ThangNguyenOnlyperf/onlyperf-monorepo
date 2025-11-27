import { cookies } from "next/headers";
import {
  CUSTOMER_SESSION_META_COOKIE,
  type CustomerSession,
} from "./customer-account";
import {
  ShopifyAPIError,
  ShopifyNetworkError,
  ShopifyTimeoutError,
} from "./error-types";

const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-04";

function getShopDomain(): string {
  const domain =
    process.env.NEXT_PUBLIC_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) {
    throw new Error(
      "STORE_DOMAIN not configured. Please set NEXT_PUBLIC_STORE_DOMAIN or SHOPIFY_STORE_DOMAIN in .env.local",
    );
  }
  return domain;
}

// Default Customer Account API GraphQL endpoint per Shopify docs:
// https://shopify.dev/docs/api/customer/2025-04#endpoints-and-queries
function getDefaultCustomerAccountGraphQLURL(): string {
  return `https://${getShopDomain()}/customer/api/${DEFAULT_API_VERSION}/graphql`;
}

// Cache discovered API endpoints (server-side only)
let discoveredApiEndpoints: {
  graphql_api: string;
  mcp_api: string;
} | null = null;

/**
 * Discovers Customer Account API endpoints from Shopify's discovery endpoint.
 * Uses in-memory caching to avoid repeated network requests.
 *
 * @see https://shopify.dev/docs/api/customer#endpoints-and-queries
 */
async function discoverGraphQLEndpoint(): Promise<string> {
  if (discoveredApiEndpoints?.graphql_api) {
    return discoveredApiEndpoints.graphql_api;
  }

  const shopDomain = getShopDomain();
  const discoveryUrl = `https://${shopDomain}/.well-known/customer-account-api`;

  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutMs = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(discoveryUrl, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `API discovery endpoint returned ${response.status}: ${response.statusText}`,
      );
    }

    const config = (await response.json()) as {
      graphql_api: string;
      mcp_api: string;
    };

    // Validate that we got the expected endpoints
    if (!config.graphql_api) {
      throw new Error("Discovery response missing graphql_api endpoint");
    }

    // Cache the discovered endpoints (server memory only)
    discoveredApiEndpoints = config;

    return config.graphql_api;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        "[API Discovery] Timeout discovering endpoints, falling back to default",
      );
    } else {
      console.error("[API Discovery] Failed to discover API endpoints:", error);
    }

    // Fallback to environment variable or default URL
    const fallbackUrl =
      process.env.SHOPIFY_CUSTOMER_ACCOUNT_GRAPHQL_URL ||
      getDefaultCustomerAccountGraphQLURL();

    console.warn("[API Discovery] Falling back to:", fallbackUrl);
    return fallbackUrl;
  }
}

/**
 * Executes a GraphQL request against the Shopify Customer Account API using the
 * customer OAuth access token from the session. The endpoint is discovered from
 * Shopify's /.well-known/customer-account-api endpoint (cached server-side).
 *
 * Note: Token refresh must be handled externally (e.g., in middleware or route handlers)
 * because Next.js 15 doesn't allow cookie modification from Server Components.
 */
export async function customerAccountGraphQL<T>(options: {
  session: CustomerSession;
  query: string;
  variables?: Record<string, unknown>;
}): Promise<{ data?: T; errors?: Array<{ message: string }>; status: number }> {
  // Discover the GraphQL endpoint (uses cached value if available)
  const endpoint = await discoverGraphQLEndpoint();
  const storeDomain = getShopDomain();

  const controller = new AbortController();
  const timeoutMs = 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Send the raw token with shcat_ prefix intact
        Authorization: options.session.accessToken,
        // Some environments require explicit store domain for routing.
        "Shopify-Store-Domain": storeDomain,
      },
      body: JSON.stringify({
        query: options.query,
        variables: options.variables ?? {},
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new ShopifyTimeoutError(
        "Kết nối đến Shopify quá lâu, vui lòng thử lại",
        "customerAccountGraphQL",
        timeoutMs,
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("Connect Timeout"))
    ) {
      throw new ShopifyNetworkError(
        "Không thể kết nối đến Shopify, vui lòng thử lại sau",
        error,
      );
    }

    // Re-throw other errors
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const status = res.status;
  let payload: any = null;
  try {
    const text = await res.text();
    payload = JSON.parse(text);
  } catch (err) {
    console.error("[Customer Account API] Failed to parse response:", err);
  }

  // Check for HTTP errors
  if (!res.ok) {
    throw new ShopifyAPIError(
      `Customer Account API returned ${status}`,
      status,
      "customerAccountGraphQL",
      payload?.errors,
    );
  }

  return { data: payload?.data, errors: payload?.errors, status };
}

export type CustomerProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
};

export type CustomerAddress = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  zip?: string | null;
  phoneNumber?: string | null;
};

export type CustomerOrder = {
  id: string;
  number: number; // Unique numeric identifier (Customer Account API uses 'number' not 'orderNumber')
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: {
    // Customer Account API uses 'totalPrice' not 'currentTotalPrice'
    amount: string;
    currencyCode: string;
  };
  lineItems: {
    nodes: Array<{
      title: string;
      quantity: number;
      price: {
        amount: string;
        currencyCode: string;
      };
      image?: {
        url: string;
        altText?: string;
      };
    }>;
  };
};

export async function getCustomerProfile(
  session: CustomerSession,
): Promise<CustomerProfile | null> {
  const query = /* GraphQL */ `
    query CustomerProfileQuery {
      customer {
        id
        displayName
        firstName
        lastName
        emailAddress { emailAddress }
        phoneNumber { phoneNumber }
      }
    }
  `;

  const { data, errors } = await customerAccountGraphQL<{
    customer: {
      id: string;
      displayName: string;
      firstName: string | null;
      lastName: string | null;
      emailAddress?: { emailAddress?: string | null } | null;
      phoneNumber?: { phoneNumber?: string | null } | null;
    } | null;
  }>({
    session,
    query,
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (getCustomerProfile)", errors);
  }

  if (!data?.customer) return null;

  return {
    id: data.customer.id,
    email: data.customer.emailAddress?.emailAddress ?? "",
    firstName: data.customer.firstName,
    lastName: data.customer.lastName,
    phone: data.customer.phoneNumber?.phoneNumber ?? null,
  } satisfies CustomerProfile;
}

export async function updateCustomerProfile(options: {
  session: CustomerSession;
  input: {
    firstName?: string | null;
    lastName?: string | null;
  };
}): Promise<{
  customer?: CustomerProfile | null;
  userErrors?: Array<{ field?: string[]; message: string }>;
  ok: boolean;
}> {
  const mutation = /* GraphQL */ `
    mutation UpdateCustomerProfile($input: CustomerUpdateInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          displayName
          firstName
          lastName
          emailAddress { emailAddress }
          phoneNumber { phoneNumber }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const { data, errors, status } = await customerAccountGraphQL<{
    customerUpdate: {
      customer: {
        id: string;
        displayName: string;
        firstName: string | null;
        lastName: string | null;
        emailAddress?: { emailAddress?: string | null } | null;
        phoneNumber?: { phoneNumber?: string | null } | null;
      } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>({
    session: options.session,
    query: mutation,
    variables: { input: options.input },
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (updateCustomerProfile)", {
      status,
      errors,
    });
  }

  const result = data?.customerUpdate;
  return {
    customer: result?.customer
      ? {
          id: result.customer.id,
          email: result.customer.emailAddress?.emailAddress ?? "",
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          phone: result.customer.phoneNumber?.phoneNumber ?? null,
        }
      : null,
    userErrors: result?.userErrors ?? [],
    ok: !errors?.length,
  };
}

/**
 * Update the meta cookie to reflect new customer fields without re-auth.
 */
export async function refreshCustomerMetaCookie(options: {
  session: CustomerSession;
  customer: Pick<CustomerProfile, "firstName" | "lastName" | "email" | "id"> & {
    phone?: string | null;
  };
}) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: CUSTOMER_SESSION_META_COOKIE,
    value: JSON.stringify({
      expiresAt: options.session.expiresAt,
      customer: {
        id: options.customer.id,
        email: options.customer.email,
        firstName: options.customer.firstName ?? null,
        lastName: options.customer.lastName ?? null,
      },
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Fetch customer orders from the Customer Account API.
 */
export async function getCustomerOrders(
  session: CustomerSession,
  first = 10,
): Promise<CustomerOrder[]> {
  const query = /* GraphQL */ `
    query CustomerOrders($first: Int!) {
      customer {
        orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            number
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 10) {
              nodes {
                title
                quantity
                price {
                  amount
                  currencyCode
                }
                image {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data, errors } = await customerAccountGraphQL<{
    customer: {
      orders: {
        nodes: CustomerOrder[];
      };
    };
  }>({
    session,
    query,
    variables: { first },
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (getCustomerOrders)", errors);
  }

  return data?.customer?.orders?.nodes ?? [];
}

/**
 * Fetch customer addresses from the Customer Account API.
 */
export async function getCustomerAddresses(
  session: CustomerSession,
): Promise<CustomerAddress[]> {
  const query = /* GraphQL */ `
    query CustomerAddresses {
      customer {
        addresses(first: 10) {
          nodes {
            id
            firstName
            lastName
            company
            address1
            address2
            city
            province
            country
            zip
            phoneNumber
          }
        }
      }
    }
  `;

  const { data, errors, status } = await customerAccountGraphQL<{
    customer: {
      addresses: {
        nodes: CustomerAddress[];
      };
    };
  }>({
    session,
    query,
  });

  if (errors?.length) {
    console.error("Customer Account API errors (getCustomerAddresses)", {
      errors,
      status,
      query,
    });
  }

  const addresses = data?.customer?.addresses?.nodes ?? [];

  return addresses;
}

/**
 * Create a new customer address using Shopify Customer Account API.
 */
export async function createCustomerAddress(options: {
  session: CustomerSession;
  address: {
    firstName?: string;
    lastName?: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    country: string;
    zip: string;
    phoneNumber?: string;
  };
  defaultAddress?: boolean;
}): Promise<{
  customerAddress?: CustomerAddress | null;
  userErrors?: Array<{ field?: string[]; message: string; code?: string }>;
  ok: boolean;
}> {
  const mutation = /* GraphQL */ `
    mutation CreateCustomerAddress(
      $address: CustomerAddressInput!
      $defaultAddress: Boolean
    ) {
      customerAddressCreate(
        address: $address
        defaultAddress: $defaultAddress
      ) {
        customerAddress {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phoneNumber
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  // Transform field names for Shopify CustomerAddressInput schema
  // Input uses: phoneNumber, territoryCode, zoneCode
  // Output uses: phoneNumber, country, province
  const { phoneNumber, province, country, ...addressRest } = options.address;
  const addressInput = {
    ...addressRest,
    ...(phoneNumber && { phoneNumber }),
    ...(country && { territoryCode: country }),
    ...(province && { zoneCode: province }),
  };

  const { data, errors, status } = await customerAccountGraphQL<{
    customerAddressCreate: {
      customerAddress: CustomerAddress | null;
      userErrors: Array<{ field?: string[]; message: string; code?: string }>;
    };
  }>({
    session: options.session,
    query: mutation,
    variables: {
      address: addressInput,
      defaultAddress: options.defaultAddress ?? false,
    },
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (createCustomerAddress)", {
      status,
      errors,
    });
  }

  const result = data?.customerAddressCreate;
  return {
    customerAddress: result?.customerAddress ?? null,
    userErrors: result?.userErrors ?? [],
    ok: !errors?.length && !(result?.userErrors?.length ?? 0),
  };
}

/**
 * Update an existing customer address using Shopify Customer Account API.
 */
export async function updateCustomerAddress(options: {
  session: CustomerSession;
  addressId: string;
  address: {
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phoneNumber?: string;
  };
  defaultAddress?: boolean;
}): Promise<{
  customerAddress?: CustomerAddress | null;
  userErrors?: Array<{ field?: string[]; message: string; code?: string }>;
  ok: boolean;
}> {
  const mutation = /* GraphQL */ `
    mutation UpdateCustomerAddress(
      $addressId: ID!
      $address: CustomerAddressInput!
      $defaultAddress: Boolean
    ) {
      customerAddressUpdate(
        addressId: $addressId
        address: $address
        defaultAddress: $defaultAddress
      ) {
        customerAddress {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phoneNumber
        }
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  // Transform field names for Shopify CustomerAddressInput schema
  // Input uses: phoneNumber, territoryCode, zoneCode
  // Output uses: phoneNumber, country, province
  const { phoneNumber, province, country, ...addressRest } = options.address;
  const addressInput = {
    ...addressRest,
    ...(phoneNumber && { phoneNumber }),
    ...(country && { territoryCode: country }),
    ...(province && { zoneCode: province }),
  };

  const { data, errors, status } = await customerAccountGraphQL<{
    customerAddressUpdate: {
      customerAddress: CustomerAddress | null;
      userErrors: Array<{ field?: string[]; message: string; code?: string }>;
    };
  }>({
    session: options.session,
    query: mutation,
    variables: {
      addressId: options.addressId,
      address: addressInput,
      defaultAddress: options.defaultAddress,
    },
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (updateCustomerAddress)", {
      status,
      errors,
    });
  }

  const result = data?.customerAddressUpdate;
  return {
    customerAddress: result?.customerAddress ?? null,
    userErrors: result?.userErrors ?? [],
    ok: !errors?.length && !(result?.userErrors?.length ?? 0),
  };
}

/**
 * Delete a customer address using Shopify Customer Account API.
 */
export async function deleteCustomerAddress(options: {
  session: CustomerSession;
  addressId: string;
}): Promise<{
  deletedAddressId?: string | null;
  userErrors?: Array<{ field?: string[]; message: string; code?: string }>;
  ok: boolean;
}> {
  const mutation = /* GraphQL */ `
    mutation DeleteCustomerAddress($addressId: ID!) {
      customerAddressDelete(addressId: $addressId) {
        deletedAddressId
        userErrors {
          field
          message
          code
        }
      }
    }
  `;

  const { data, errors, status } = await customerAccountGraphQL<{
    customerAddressDelete: {
      deletedAddressId: string | null;
      userErrors: Array<{ field?: string[]; message: string; code?: string }>;
    };
  }>({
    session: options.session,
    query: mutation,
    variables: {
      addressId: options.addressId,
    },
  });

  if (errors?.length) {
    console.warn("Customer Account API errors (deleteCustomerAddress)", {
      status,
      errors,
    });
  }

  const result = data?.customerAddressDelete;
  return {
    deletedAddressId: result?.deletedAddressId ?? null,
    userErrors: result?.userErrors ?? [],
    ok: !errors?.length && !(result?.userErrors?.length ?? 0),
  };
}
