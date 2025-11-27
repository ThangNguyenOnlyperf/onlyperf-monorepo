/**
 * Extracts buyer IP from various request headers
 */
export function extractBuyerIp(
  headers?: Record<string, string>,
): string | undefined {
  if (!headers) return undefined;

  // Common IP header names in order of preference
  const ipHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip", // Cloudflare
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of ipHeaders) {
    const ip = headers[header];
    if (ip) {
      // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
      // Take the first IP which is typically the original client
      const firstIp = ip.split(",")[0].trim();
      if (firstIp && isValidIp(firstIp)) {
        return firstIp;
      }
    }
  }

  return undefined;
}

/**
 * Validates if a string is a valid IP address
 */
export function isValidIp(ip: string): boolean {
  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    return ip.split(".").every((octet) => {
      const num = parseInt(octet, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  // Basic IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(ip)) {
    return true;
  }

  // Check for IPv6 with :: (compressed format)
  const compressedIpv6Regex =
    /^([0-9a-fA-F]{1,4}:){0,6}::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;
  return compressedIpv6Regex.test(ip);
}

/**
 * Gets request headers from various Next.js contexts
 */
export function getRequestHeaders(request?: {
  headers?: Record<string, string>;
  get?: (key: string) => string | undefined;
}): Record<string, string> {
  if (!request) return {};

  if (request.get && typeof request.get === "function") {
    const headers: Record<string, string> = {};
    const headerNames = [
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip",
      "x-client-ip",
      "accept-language",
    ];

    for (const name of headerNames) {
      const value = request.get(name);
      if (value) {
        headers[name] = value;
      }
    }

    return headers;
  }

  // Handle plain headers object
  return request.headers || {};
}
