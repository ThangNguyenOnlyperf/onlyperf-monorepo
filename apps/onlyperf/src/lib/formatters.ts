/**
 * Price formatting utilities
 */

export interface PriceInput {
  amount: string;
  currencyCode: string;
}

/**
 * Get locale based on currency code
 */
function getLocaleForCurrency(currencyCode: string): string {
  const currencyLocaleMap: Record<string, string> = {
    VND: "vi-VN",
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    JPY: "ja-JP",
    CNY: "zh-CN",
    KRW: "ko-KR",
    THB: "th-TH",
    SGD: "en-SG",
  };

  return currencyLocaleMap[currencyCode] || "en-US";
}

export function formatPrice({ amount, currencyCode }: PriceInput): string {
  const numeric = Number.parseFloat(amount);

  if (Number.isNaN(numeric)) {
    return amount;
  }

  const locale = getLocaleForCurrency(currencyCode);

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currencyCode} ${numeric.toFixed(0)}`;
  }
}

export function formatMoney(price: PriceInput): string {
  const amount = Number.parseFloat(price.amount);

  if (!Number.isFinite(amount)) {
    return `${price.amount} ${price.currencyCode}`;
  }

  const locale = getLocaleForCurrency(price.currencyCode);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currencyCode,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Text formatting utilities
 */

export function excerpt(text: string, maxLength = 140): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
