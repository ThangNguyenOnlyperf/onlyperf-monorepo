import { addMonths } from "date-fns";

// =============================================================================
// Types
// =============================================================================

export type WarrantyStatusDisplay = {
  label: string;
  isActive: boolean;
};

export type WarrantyInfo = {
  status: WarrantyStatusDisplay;
  endDate: Date | null;
  daysRemaining: number;
};

// =============================================================================
// QR Code Validation
// =============================================================================

const QR_CODE_REGEX = /^[A-Z]{4}\d{4}$/;

export function isValidQrCodeFormat(qrCode: string): boolean {
  return QR_CODE_REGEX.test(qrCode);
}

export function normalizeQrCode(qrCode: string): string {
  return qrCode.toUpperCase();
}

// =============================================================================
// Warranty Helpers
// =============================================================================

/**
 * Compute warranty end date based on delivery date and warranty months
 */
export function computeWarrantyEndDate(
  deliveredAt: Date | null,
  warrantyMonths: number,
): Date | null {
  if (!deliveredAt) return null;
  return addMonths(deliveredAt, warrantyMonths);
}

/**
 * Get warranty status display info
 */
export function getWarrantyStatusDisplay(
  status: string,
  warrantyEndDate: Date | null,
): WarrantyStatusDisplay {
  const now = new Date();

  if (status === "pending") {
    return { label: "Chờ kích hoạt", isActive: false };
  }

  if (status === "void") {
    return { label: "Đã hủy", isActive: false };
  }

  if (status === "expired" || (warrantyEndDate && now > warrantyEndDate)) {
    return { label: "Đã hết hạn", isActive: false };
  }

  return { label: "Còn hiệu lực", isActive: true };
}

/**
 * Compute full warranty info
 */
export function computeWarrantyInfo(
  warrantyStatus: string,
  deliveredAt: Date | null,
  warrantyMonths: number,
): WarrantyInfo {
  const endDate = computeWarrantyEndDate(deliveredAt, warrantyMonths);
  const status = getWarrantyStatusDisplay(warrantyStatus, endDate);

  const daysRemaining =
    endDate && status.isActive
      ? Math.max(
          0,
          Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

  return {
    status,
    endDate,
    daysRemaining,
  };
}

/**
 * Check if customer is the owner of the product
 */
export function isProductOwner(
  currentOwnerId: string | null,
  customerId: string | null,
): boolean {
  if (!customerId || !currentOwnerId) return false;
  return currentOwnerId === customerId;
}
