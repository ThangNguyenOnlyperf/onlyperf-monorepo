/**
 * Custom error types for Shopify API operations
 * Provides better error handling and user-friendly messages
 */

/**
 * Error thrown when Shopify API request times out
 */
export class ShopifyTimeoutError extends Error {
  public readonly code = "SHOPIFY_TIMEOUT";
  public readonly isRetryable = true;
  public readonly statusCode = 504;

  constructor(
    message = "Kết nối đến Shopify quá lâu, vui lòng thử lại",
    public readonly operation?: string,
    public readonly timeout?: number,
  ) {
    super(message);
    this.name = "ShopifyTimeoutError";
    Object.setPrototypeOf(this, ShopifyTimeoutError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      operation: this.operation,
      timeout: this.timeout,
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Generic error for Shopify API failures
 */
export class ShopifyAPIError extends Error {
  public readonly code = "SHOPIFY_API_ERROR";
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly operation?: string,
    public readonly graphQLErrors?: unknown[],
  ) {
    super(message);
    this.name = "ShopifyAPIError";
    // 5xx errors are typically retryable, 4xx are not
    this.isRetryable = statusCode ? statusCode >= 500 : false;
    Object.setPrototypeOf(this, ShopifyAPIError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      operation: this.operation,
      isRetryable: this.isRetryable,
      graphQLErrors: this.graphQLErrors,
    };
  }
}

/**
 * Error thrown when network connection fails
 */
export class ShopifyNetworkError extends Error {
  public readonly code = "SHOPIFY_NETWORK_ERROR";
  public readonly isRetryable = true;

  constructor(
    message = "Không thể kết nối đến Shopify",
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "ShopifyNetworkError";
    Object.setPrototypeOf(this, ShopifyNetworkError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      isRetryable: this.isRetryable,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Type guard to check if error is a Shopify-related error
 */
export function isShopifyError(
  error: unknown,
): error is ShopifyTimeoutError | ShopifyAPIError | ShopifyNetworkError {
  return (
    error instanceof ShopifyTimeoutError ||
    error instanceof ShopifyAPIError ||
    error instanceof ShopifyNetworkError
  );
}

/**
 * Get user-friendly error message in Vietnamese
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ShopifyTimeoutError) {
    return "Kết nối đến cửa hàng quá chậm. Vui lòng thử lại sau vài giây.";
  }

  if (error instanceof ShopifyNetworkError) {
    return "Không thể kết nối đến cửa hàng. Vui lòng kiểm tra kết nối mạng.";
  }

  if (error instanceof ShopifyAPIError) {
    if (error.statusCode === 429) {
      return "Hệ thống đang bận. Vui lòng thử lại sau.";
    }
    if (error.statusCode && error.statusCode >= 500) {
      return "Cửa hàng đang gặp sự cố. Vui lòng thử lại sau.";
    }
    return "Có lỗi xảy ra. Vui lòng thử lại.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Có lỗi không xác định xảy ra";
}
