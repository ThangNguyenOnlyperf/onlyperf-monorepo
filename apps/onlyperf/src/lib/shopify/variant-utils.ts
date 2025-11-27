export interface VariantOptionInput {
  name: string;
  value: string;
}

export function normalizeToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

const RAW_COLOR_OPTION_NAMES = [
  "Color",
  "Colour",
  "Colorway",
  "Màu",
  "Màu sắc",
  "Mau",
  "Mau sac",
  "Shade",
  "Tone",
];

const RAW_SIZE_OPTION_NAMES = [
  "Size",
  "Kích thước",
  "Kich thuoc",
  "Kích cỡ",
  "Kich co",
  "Grip",
  "Handle Size",
  "Grip Size",
  "Chiều dài",
  "Chieu dai",
  "Chiều rộng",
  "Chieu rong",
  "Dimension",
  "Dimensions",
  "Fit",
];

const COLOR_OPTION_NAME_TOKENS = new Set(
  RAW_COLOR_OPTION_NAMES.map((name) => normalizeToken(name)),
);

const SIZE_OPTION_NAME_TOKENS = new Set(
  RAW_SIZE_OPTION_NAMES.map((name) => normalizeToken(name)),
);

export const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#111827",
  den: "#111827",
  white: "#f8fafc",
  trang: "#f8fafc",
  gray: "#9ca3af",
  grey: "#9ca3af",
  xam: "#9ca3af",
  charcoal: "#374151",
  silver: "#d1d5db",
  red: "#dc2626",
  do: "#dc2626",
  crimson: "#b91c1c",
  orange: "#f97316",
  cam: "#f97316",
  amber: "#f59e0b",
  yellow: "#facc15",
  vang: "#facc15",
  green: "#22c55e",
  xanhla: "#22c55e",
  teal: "#14b8a6",
  mint: "#34d399",
  blue: "#2563eb",
  navy: "#1d4ed8",
  indigo: "#4338ca",
  cyan: "#06b6d4",
  turquoise: "#0d9488",
  purple: "#8b5cf6",
  violet: "#7c3aed",
  tim: "#8b5cf6",
  magenta: "#db2777",
  pink: "#f472b6",
  hong: "#f472b6",
  rose: "#fb7185",
  brown: "#92400e",
  nau: "#92400e",
  beige: "#f5f5dc",
  cream: "#fef3c7",
  ivory: "#fefce8",
  khaki: "#b45309",
  bronze: "#b45309",
};

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(
    value.trim(),
  );
}

export function isColorOptionName(optionName: string): boolean {
  return COLOR_OPTION_NAME_TOKENS.has(normalizeToken(optionName));
}

export function isSizeOptionName(optionName: string): boolean {
  return SIZE_OPTION_NAME_TOKENS.has(normalizeToken(optionName));
}

export function extractColorOption(
  options: VariantOptionInput[],
): string | null {
  const colorOption = options.find((option) => isColorOptionName(option.name));
  return colorOption?.value ?? null;
}

export function extractSizeOption(
  options: VariantOptionInput[],
): string | null {
  const sizeOption = options.find((option) => !isSizeOptionName(option.name));
  return sizeOption?.value ?? null;
}

export function resolveSwatchColor(
  rawColorHex: string | null,
  colorName: string | null,
): string | null {
  if (rawColorHex) {
    const trimmed = rawColorHex.trim();
    const lower = trimmed.toLowerCase();

    if (isHexColor(trimmed)) {
      return trimmed;
    }

    if (lower.startsWith("rgb") || lower.startsWith("hsl")) {
      return trimmed;
    }
  }

  if (!colorName) {
    return null;
  }

  const trimmedColor = colorName.trim();
  const normalized = normalizeToken(trimmedColor);

  if (isHexColor(trimmedColor)) {
    return trimmedColor;
  }

  return COLOR_NAME_TO_HEX[normalized] ?? null;
}
