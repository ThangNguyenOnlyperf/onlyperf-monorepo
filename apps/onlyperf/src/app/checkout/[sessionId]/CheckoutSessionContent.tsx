"use client";

import { Building2, CreditCard, Info } from "lucide-react";
import { SepayPaymentStatus } from "@/components/checkout/SepayPaymentStatus";
import { useLocale } from "@/contexts/LocaleContext";
import type { CheckoutSessionState } from "@/lib/checkout/session-schema";
import { getCheckoutCopy } from "@/lib/i18n/checkout";
import { getLocaleString } from "@/lib/shopify/locale";

interface CheckoutSessionContentProps {
  session: CheckoutSessionState;
}

function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch (_error) {
    return `${amount} ${currency}`;
  }
}

export function CheckoutSessionContent({
  session,
}: CheckoutSessionContentProps) {
  const { locale } = useLocale();
  const localeString = getLocaleString(locale);
  const copy = getCheckoutCopy(locale);

  const amountLabel = formatCurrency(
    session.amount,
    session.currency,
    localeString,
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold">{copy.page.title}</h1>
          <p className="text-base text-muted-foreground">
            {copy.page.instructions}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* QR Code Section */}
          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="border-zinc-200 bg-white p-4">
                <img
                  src={session.qrImageUrl}
                  alt="Sepay payment QR"
                  width={260}
                  height={260}
                  className="h-[260px] w-[260px] object-contain"
                />
              </div>

              <div className="w-full space-y-3">
                <div className="rounded-lg bg-zinc-50 p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {copy.page.amountLabel}
                  </p>
                  <p className="text-2xl font-bold">{amountLabel}</p>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {copy.page.paymentCodeLabel}
                  </p>
                  <p className="text-xl font-mono font-semibold text-primary">
                    {session.paymentCode}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Info & Instructions */}
          <div className="space-y-6">
            {/* Bank Information */}
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {copy.page.bankInfoTitle}
                </h2>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">
                    {copy.page.bankAccountNumberLabel}
                  </p>
                  <p className="font-mono text-base font-semibold">
                    {session.bank.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    {copy.page.bankAccountNameLabel}
                  </p>
                  <p className="font-semibold">{session.bank.accountName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    {copy.page.bankBinLabel}
                  </p>
                  <p className="font-semibold">{session.bank.bin}</p>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="rounded-lg bg-green-50 border border-green-200 p-6">
              <div className="flex items-start gap-2 mb-3">
                <Info className="w-5 h-5 text-green-700 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-900">
                  {copy.page.notesTitle}
                </p>
              </div>
              <ul className="space-y-2 text-sm text-green-800 pl-7">
                {copy.page.notes.map((note) => (
                  <li key={note} className="list-disc">
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Status */}
            <SepayPaymentStatus
              sessionId={session.sessionId}
              initialStatus={session.status}
              expiresAt={
                session.expiresAt ? session.expiresAt.toISOString() : null
              }
              successUrl="/checkout/success"
              failureUrl="/checkout/failed"
              initialLastError={session.lastError}
              initialOrderId={session.shopifyOrderId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSessionContent;
