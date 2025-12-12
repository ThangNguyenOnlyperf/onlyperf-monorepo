/**
 * Product short code generator for compact QR codes
 * Format: ABCD1234 (4 letters + 4 digits)
 *
 * Character set: A-Z excluding O and I (24 letters) + 0-9 (10 digits)
 * Total combinations: 24^4 × 10^4 = 331,776,000 unique codes
 */

// Alphabet excluding ambiguous characters O and I
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 letters
const DIGITS = '0123456789'; // 10 digits

/**
 * Generate a random short code in format ABCD1234
 * @returns 8-character code (4 letters + 4 digits)
 */
export function generateShortCode(): string {
  const letters = Array.from({ length: 4 }, () =>
    LETTERS[Math.floor(Math.random() * LETTERS.length)]
  ).join('');

  const digits = Array.from({ length: 4 }, () =>
    DIGITS[Math.floor(Math.random() * DIGITS.length)]
  ).join('');

  return `${letters}${digits}`;
}

/**
 * Validate if a string matches the short code format
 * @param code The code to validate
 * @returns True if valid format
 */
export function isValidShortCode(code: string): boolean {
  if (code.length !== 8) return false;

  const letterPart = code.slice(0, 4);
  const digitPart = code.slice(4, 8);

  // Check letters (no O or I)
  if (!/^[A-Z]{4}$/.test(letterPart)) return false;
  if (letterPart.includes('O') || letterPart.includes('I')) return false;

  // Check digits
  if (!/^\d{4}$/.test(digitPart)) return false;

  return true;
}

/**
 * Generate a unique short code with collision checking
 * @param existingCodes Set of existing codes to check against
 * @param maxAttempts Maximum number of generation attempts
 * @returns Unique short code
 * @throws Error if unable to generate unique code after maxAttempts
 */
export function generateUniqueShortCode(
  existingCodes: Set<string>,
  maxAttempts = 100
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShortCode();
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error(
    `Failed to generate unique short code after ${maxAttempts} attempts. ` +
    `Consider increasing code length or using different format.`
  );
}

/**
 * Format a short code for display (adds dash for readability)
 * @param code The short code
 * @returns Formatted code (e.g., ABCD-1234)
 */
export function formatShortCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

/**
 * Parse a formatted short code back to raw format
 * @param formattedCode The formatted code (e.g., ABCD-1234)
 * @returns Raw code (e.g., ABCD1234)
 */
export function parseShortCode(formattedCode: string): string {
  return formattedCode.replace(/-/g, '');
}

/**
 * Extract product code from QR code input
 * Handles both URL format (https://onlyperf.com/p/ABCD1234) and raw code (ABCD1234)
 * @param qrCodeOrUrl The scanned QR code (URL or raw code)
 * @returns The extracted product code
 */
export function extractProductCode(qrCodeOrUrl: string): string {
  if (qrCodeOrUrl.includes('/p/')) {
    const parts = qrCodeOrUrl.split('/p/');
    return parts[parts.length - 1] ?? qrCodeOrUrl;
  }
  return qrCodeOrUrl;
}
