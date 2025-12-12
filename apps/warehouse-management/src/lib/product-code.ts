/**
 * Product short code generator for compact QR codes
 * Format: 10-character NanoID (e.g., X7KM9PQ2NR)
 *
 * Character set: 23456789ABCDEFGHJKLMNPQRSTUVWXYZ (32 chars)
 * - No 0/O (zero vs letter O confusion)
 * - No 1/I/l (one vs letter I vs lowercase L confusion)
 * - Uppercase only for readability on printed stamps
 *
 * Total combinations: 32^10 = 1,125,899,906,842,624 (1.1 quadrillion)
 * Cryptographically secure random generation via NanoID
 */

import { customAlphabet } from 'nanoid';

// Safe alphabet: no 0, O, 1, I, l (ambiguous characters)
const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 10;

// NanoID generator with cryptographically secure randomness
const nanoid = customAlphabet(SAFE_ALPHABET, CODE_LENGTH);

/**
 * Generate a cryptographically secure short code
 * @returns 10-character code (e.g., X7KM9PQ2NR)
 */
export function generateShortCode(): string {
  return nanoid();
}

/**
 * Validate if a string matches the new NanoID format (10 chars)
 * @param code The code to validate
 * @returns True if valid v2 format
 */
function isValidNanoCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  // Check all characters are in safe alphabet
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/.test(code);
}

/**
 * Validate if a string matches the legacy format (8 chars: ABCD1234)
 * @param code The code to validate
 * @returns True if valid legacy format
 */
function isValidLegacyCode(code: string): boolean {
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
 * Validate if a string matches any supported code format
 * Supports both new NanoID (10 chars) and legacy (8 chars ABCD1234)
 * @param code The code to validate
 * @returns True if valid format
 */
export function isValidShortCode(code: string): boolean {
  return isValidNanoCode(code) || isValidLegacyCode(code);
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
 * @returns Formatted code (e.g., X7KM9-PQ2NR for 10-char, ABCD-1234 for 8-char)
 */
export function formatShortCode(code: string): string {
  if (code.length === 10) {
    // New format: split in middle
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  }
  if (code.length === 8) {
    // Legacy format: split at letter/digit boundary
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
  }
  return code;
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
