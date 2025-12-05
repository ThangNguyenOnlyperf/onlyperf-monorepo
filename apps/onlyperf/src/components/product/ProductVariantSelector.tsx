import ProductVariantDivider from "./ProductVariantDivider";

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelect: (size: string) => void;
}

/**
 * Size selector component with button options
 */
export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
}: SizeSelectorProps) {
  if (sizes.length === 0) return null;
  return (
    <div >
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Kích cỡ
      </span>
      <div className="flex flex-wrap gap-2 mt-2">
        {sizes.map((size) => {
          const isActive = size === selectedSize;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onSelect(size)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                isActive
                  ? "border-black bg-primary hover:bg-primary/90 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-primary hover:bg-primary/90 hover:text-white"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>
      <ProductVariantDivider />
    </div>
  );
}

interface ColorOption {
  token: string;
  label: string;
  swatchColor: string | null;
}

interface ColorSelectorProps {
  colors: ColorOption[];
  selectedColorToken: string | null;
  onSelect: (token: string) => void;
}

/**
 * Color selector component with swatch buttons
 */
export function ColorSelector({
  colors,
  selectedColorToken,
  onSelect,
}: ColorSelectorProps) {
  if (colors.length === 0) {
    return null
  };
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Màu sắc
      </span>
      <div className="flex flex-wrap gap-2">
        {colors.map(({ token, label, swatchColor }) => {
          const isActive = token === selectedColorToken;
          return (
            <button
              key={token}
              type="button"
              onClick={() => onSelect(token)}
              aria-label={`Chọn màu ${label}`}
              title={label}
              className={`flex h-10 w-10 items-center cursor-pointer justify-center rounded-full border-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white ${
                isActive
                  ? "border-black ring-black ring-offset-4 ring-offset-white dark:border-white dark:ring-white dark:ring-offset-zinc-900"
                  : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <span
                className="h-7 w-7 rounded-full"
                style={{ backgroundColor: swatchColor ?? undefined }}
              />
            </button>
          );
        })}
      </div>
      <ProductVariantDivider />
    </div>
  );
}

interface VariantInfoProps {
  sizeLabel: string | null;
  colorLabel: string | null;
  colorHex: string | null;
}

/**
 * Selected variant information display
 */
export function VariantInfo({
  sizeLabel,
  colorLabel,
  colorHex,
}: VariantInfoProps) {
  if (!sizeLabel && !colorLabel) return null;
  return (
    <div className="text-xs text-zinc-500 dark:text-zinc-500">
      <span className="font-medium">Đã chọn:</span> {sizeLabel ?? "—"}
      {colorLabel ? (
        <>
          {" "}
          / {colorLabel}
          {colorHex ? (
            <span
              className="ml-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ backgroundColor: colorHex }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
