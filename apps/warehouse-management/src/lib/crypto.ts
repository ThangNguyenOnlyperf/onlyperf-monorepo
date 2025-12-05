/**
 * Encryption utilities for sensitive data (API keys, secrets)
 * Uses AES-256-GCM for authenticated encryption
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits for AES-256
const ENCRYPTED_PREFIX = "enc:v1:"; // Prefix to identify encrypted values

/**
 * Get the encryption key from environment
 * Throws if not configured (fail-fast for security)
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.SECRETS_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  // If the key is a hex string, convert to buffer
  if (secret.length === 64 && /^[a-fA-F0-9]+$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  // Otherwise, derive a key from the passphrase using scrypt
  // Use a fixed salt derived from the secret itself for deterministic key derivation
  const salt = scryptSync(secret, "perf-warehouse-salt", SALT_LENGTH);
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Check if a value is already encrypted
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/**
 * Encrypt a secret value
 * Returns the encrypted value prefixed with version identifier
 *
 * @param plaintext - The secret to encrypt
 * @returns Encrypted string in format: enc:v1:iv:authTag:ciphertext (all base64)
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    return plaintext; // Don't encrypt empty strings
  }

  // Don't double-encrypt
  if (isEncrypted(plaintext)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: enc:v1:iv:authTag:ciphertext
  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt an encrypted secret value
 *
 * @param ciphertext - The encrypted value from encryptSecret
 * @returns Original plaintext value
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) {
    return ciphertext; // Return empty strings as-is
  }

  // If not encrypted, return as-is (for backwards compatibility during migration)
  if (!isEncrypted(ciphertext)) {
    return ciphertext;
  }

  const key = getEncryptionKey();

  // Parse the encrypted format: enc:v1:iv:authTag:ciphertext
  const withoutPrefix = ciphertext.slice(ENCRYPTED_PREFIX.length);
  const parts = withoutPrefix.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;

  const iv = Buffer.from(ivBase64!, "base64");
  const authTag = Buffer.from(authTagBase64!, "base64");
  const encrypted = Buffer.from(encryptedBase64!, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Mask a secret for display (show only last 4 characters)
 *
 * @param secret - The secret to mask (can be encrypted or plaintext)
 * @returns Masked string like "••••••••abc1"
 */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) {
    return "";
  }

  // Decrypt if needed to get the actual value for masking
  const plaintext = isEncrypted(secret) ? decryptSecret(secret) : secret;

  if (plaintext.length <= 4) {
    return "••••";
  }

  const lastFour = plaintext.slice(-4);
  return `••••••••${lastFour}`;
}

/**
 * Check if encryption is properly configured
 * Use this for health checks or setup validation
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
