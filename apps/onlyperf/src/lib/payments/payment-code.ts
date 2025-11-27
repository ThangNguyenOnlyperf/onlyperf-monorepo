const PAYMENT_CODE_PREFIX = "PERF";
const PAYMENT_CODE_REGEX = /PERF(\d{8})/i;

function buildNumericSuffix(seed?: string) {
  const seedDigits = seed ? seed.replace(/\D/g, "") : "";
  const randomDigits = Math.floor(Math.random() * 100_000_000)
    .toString()
    .padStart(8, "0");
  const combined = `${seedDigits}${randomDigits}`;
  return combined.slice(-8);
}

export function generatePaymentCode(seed?: string) {
  const suffix = buildNumericSuffix(seed);
  return `${PAYMENT_CODE_PREFIX}${suffix}`;
}

export function extractPaymentCode(content: string) {
  const match = content.match(PAYMENT_CODE_REGEX);
  return match ? `${PAYMENT_CODE_PREFIX}${match[1]}` : null;
}

export function isPaymentCode(code: string) {
  return PAYMENT_CODE_REGEX.test(code);
}
