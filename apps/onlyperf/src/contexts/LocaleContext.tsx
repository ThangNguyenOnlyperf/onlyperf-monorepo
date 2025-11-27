"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Locale, LocalizationContext } from "@/lib/shopify/locale";
import {
  detectLocale,
  getLocaleString,
  PRIMARY_LOCALE,
  SUPPORTED_LOCALES,
} from "@/lib/shopify/locale";

interface LocaleContextType extends LocalizationContext {
  setLocale: (locale: Locale) => void;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({
  children,
  initialLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale || PRIMARY_LOCALE,
  );
  const [availableLocales, setAvailableLocales] =
    useState<Locale[]>(SUPPORTED_LOCALES);
  const [isLoading, setIsLoading] = useState(false);

  // Set locale and save to cookies
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);

    // Save to cookies for persistence
    if (typeof window !== "undefined") {
      document.cookie = `shopify-locale=${JSON.stringify(newLocale)}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  // Detect locale on mount if not provided
  useEffect(() => {
    if (!initialLocale) {
      const detectedLocale = detectLocale({
        headers:
          typeof window !== "undefined"
            ? {
                "accept-language": navigator.language,
              }
            : undefined,
        cookies:
          typeof window !== "undefined"
            ? Object.fromEntries(
                document.cookie.split(";").map((c) => c.trim().split("=")),
              )
            : undefined,
      });
      setLocaleState(detectedLocale);
    }
  }, [initialLocale]);

  const value: LocaleContextType = {
    locale,
    availableLocales,
    defaultLocale: PRIMARY_LOCALE,
    setLocale,
    isLoading,
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

/**
 * Hook to get the current locale string (e.g., "en-US")
 */
export function useLocaleString() {
  const { locale } = useLocale();
  return getLocaleString(locale);
}

/**
 * Hook to check if current locale matches a specific locale
 */
export function useIsLocale(targetLocale: Locale) {
  const { locale } = useLocale();
  return (
    locale.country === targetLocale.country &&
    locale.language === targetLocale.language
  );
}

/**
 * Hook to get currency information for current locale
 */
export function useLocaleCurrency() {
  const { locale } = useLocale();

  // Map locales to currencies (you can expand this)
  const currencyMap: Record<string, string> = {
    "US-EN": "USD",
    "VN-VI": "VND",
    "GB-EN": "GBP",
    "CA-EN": "CAD",
    "CA-FR": "CAD",
    "AU-EN": "AUD",
    "FR-FR": "EUR",
    "DE-DE": "EUR",
    "JP-JA": "JPY",
  };

  return currencyMap[`${locale.country}-${locale.language}`] || "USD";
}
