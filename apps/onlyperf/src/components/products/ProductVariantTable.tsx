import { formatMoney } from "@/lib/formatters";
import type { VariantSummary } from "@/lib/shopify/variant-sorting";

interface ProductVariantTableProps {
  variants: VariantSummary[];
}

export function ProductVariantTable({ variants }: ProductVariantTableProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
        Chi tiết phiên bản
      </h2>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-700">
          <thead className="bg-zinc-50 dark:bg-zinc-800/80">
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
                Kích cỡ
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
                Màu sắc
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
                Giá
              </th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
                Tình trạng
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {variants.map(({ variant, size, color, swatchColor }) => (
              <tr key={variant.id}>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                  {size ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                    {swatchColor ? (
                      <span
                        className="h-3 w-3 rounded-full border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: swatchColor }}
                      />
                    ) : null}
                    <span>{color ?? "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-white">
                  {formatMoney(variant.price)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                      variant.availableForSale
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                  >
                    {variant.availableForSale ? "Còn hàng" : "Hết hàng"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
