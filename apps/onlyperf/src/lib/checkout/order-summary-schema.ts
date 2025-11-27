import { z } from "zod";
import { guestEmailSchema } from "@/lib/validation/email";
import { vietnamesePhoneSchema } from "@/lib/validation/phone";

/**
 * Vietnamese Address Schema
 * Maps to Shopify address format:
 * - city = Province name (Tỉnh/Thành phố)
 * - address1 = Full street address (Quận, Phường, Street)
 * - province = null (not used for Vietnam)
 * - country = "VN"
 * - zip = "700000" (default, postal codes not used in Vietnam)
 */
export const vietnameseAddressSchema = z.object({
  // Personal info
  firstName: z
    .string()
    .min(1, "Vui lòng nhập tên")
    .max(50, "Tên không được quá 50 ký tự"),
  lastName: z
    .string()
    .min(1, "Vui lòng nhập họ")
    .max(50, "Họ không được quá 50 ký tự"),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(/^(\+84|0)[0-9]{9,10}$/, "Số điện thoại không hợp lệ"),

  // Vietnamese address structure
  provinceCode: z.number().min(1, "Vui lòng chọn tỉnh/thành phố"),
  provinceName: z.string().min(1),
  districtCode: z.number().min(1, "Vui lòng chọn quận/huyện"),
  districtName: z.string().min(1),
  wardCode: z.number().min(1, "Vui lòng chọn phường/xã"),
  wardName: z.string().min(1),

  // Detailed address
  address1: z
    .string()
    .min(1, "Vui lòng nhập số nhà, tên đường")
    .max(100, "Địa chỉ không được quá 100 ký tự"),
  address2: z.string().optional().nullable(),

  // Shopify compatibility (auto-populated from Vietnamese fields)
  city: z.string().min(1), // Will be provinceName
  province: z.string().nullable().default(null), // Not used for VN
  country: z.string().default("VN"),
  zip: z.string().default("700000"), // Default Vietnamese postal code

  company: z.string().optional().nullable(),
});

export type VietnameseAddressData = z.infer<typeof vietnameseAddressSchema>;

/**
 * Shopify-compatible address format
 * Generated from Vietnamese address for Shopify API calls
 */
export const shopifyAddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().min(1),
  city: z.string().min(1), // Province name
  address1: z.string().min(1), // Full address including district, ward, street
  address2: z.string().optional().nullable(),
  province: z.string().nullable().optional(), // null for Vietnam
  country: z.string().default("VN"),
  zip: z.string().default("700000"),
  company: z.string().optional().nullable(),
});

export type ShopifyAddressData = z.infer<typeof shopifyAddressSchema>;

/**
 * Saved Address Schema
 * For displaying existing addresses in the address book
 */
export const savedAddressSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  city: z.string(),
  address1: z.string(),
  address2: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string(),
  company: z.string().nullable(),
  zip: z.string(),
});

export type SavedAddressData = z.infer<typeof savedAddressSchema>;

/**
 * Order Summary Form Schema
 * Combines payment method, address selection, and new address form
 *
 * Conditional validation:
 * - If useExistingAddress = true: Only validate selectedAddressId
 * - If useExistingAddress = false: Validate all new address fields
 * - If isGuest = true: Validate guest customer info (email, phone, name)
 */
export const orderSummaryFormSchema = z
  .object({
    paymentMethod: z.enum(["bank_transfer", "cod"]),

    // Guest checkout fields
    isGuest: z.boolean(),
    guestEmail: z.string().optional(),
    guestPhone: z.string().optional(),
    guestFirstName: z.string().optional(),
    guestLastName: z.string().optional(),

    // Address selection
    useExistingAddress: z.boolean(),
    selectedAddressId: z.string().optional().nullable(),

    // New address form (validated only if useExistingAddress is false)
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),

    // Vietnamese address structure
    provinceCode: z.number().optional(),
    provinceName: z.string().optional(),
    districtCode: z.number().optional(),
    districtName: z.string().optional(),
    wardCode: z.number().optional(),
    wardName: z.string().optional(),

    // Detailed address
    address1: z.string().optional(),
    address2: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validate guest email if guest checkout
    if (data.isGuest) {
      // Validate guest email
      if (!data.guestEmail || data.guestEmail.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vui lòng nhập email",
          path: ["guestEmail"],
        });
      } else {
        // Validate with guestEmailSchema (accepts all valid email formats)
        const emailValidation = guestEmailSchema.safeParse(data.guestEmail);
        if (!emailValidation.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              emailValidation.error.issues[0]?.message || "Email không hợp lệ",
            path: ["guestEmail"],
          });
        }
      }

      // For guests, name and phone come from the address fields
      // No need to validate separate guestPhone, guestFirstName, guestLastName
      // They will be validated as part of the address form
    }

    // If using existing address, validate that an address is selected
    if (data.useExistingAddress) {
      if (!data.selectedAddressId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Vui lòng chọn địa chỉ",
          path: ["selectedAddressId"],
        });
      }
      return; // Skip new address validation
    }

    // If NOT using existing address, validate all new address fields
    if (!data.firstName || data.firstName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập tên",
        path: ["firstName"],
      });
    } else if (data.firstName.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tên không được quá 50 ký tự",
        path: ["firstName"],
      });
    }

    if (!data.lastName || data.lastName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập họ",
        path: ["lastName"],
      });
    } else if (data.lastName.length > 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Họ không được quá 50 ký tự",
        path: ["lastName"],
      });
    }

    if (!data.phone || data.phone.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập số điện thoại",
        path: ["phone"],
      });
    } else if (!/^(\+84|0)[0-9]{9,10}$/.test(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Số điện thoại không hợp lệ",
        path: ["phone"],
      });
    }

    if (!data.provinceCode || data.provinceCode < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn Tỉnh/Thành phố",
        path: ["provinceCode"],
      });
    }

    if (!data.provinceName || data.provinceName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn tỉnh/thành phố",
        path: ["provinceName"],
      });
    }

    if (!data.districtCode || data.districtCode < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn Quận/Huyện",
        path: ["districtCode"],
      });
    }

    if (!data.districtName || data.districtName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn quận/huyện",
        path: ["districtName"],
      });
    }

    if (!data.wardCode || data.wardCode < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn Phường/Xã",
        path: ["wardCode"],
      });
    }

    if (!data.wardName || data.wardName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng chọn phường/xã",
        path: ["wardName"],
      });
    }

    if (!data.address1 || data.address1.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập số nhà, tên đường",
        path: ["address1"],
      });
    } else if (data.address1.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Địa chỉ không được quá 100 ký tự",
        path: ["address1"],
      });
    }
  });

export type OrderSummaryFormData = z.infer<typeof orderSummaryFormSchema>;

/**
 * Helper function to convert Vietnamese address to Shopify format
 */
export function convertToShopifyAddress(
  vietnameseAddress: VietnameseAddressData,
): ShopifyAddressData {
  return {
    firstName: vietnameseAddress.firstName,
    lastName: vietnameseAddress.lastName,
    phoneNumber: vietnameseAddress.phone,
    // Map Vietnamese address structure to Shopify format
    city: vietnameseAddress.provinceName, // e.g., "Hồ Chí Minh"
    // Combine district, ward, and street into address1
    address1: `${vietnameseAddress.districtName}, ${vietnameseAddress.wardName}, ${vietnameseAddress.address1}`,
    address2: vietnameseAddress.address2 || null,
    province: null, // Not used for Vietnam
    country: "VN",
    zip: vietnameseAddress.zip || "700000",
    company: vietnameseAddress.company || null,
  };
}

/**
 * Helper function to validate Vietnamese address has all required fields
 */
export function isValidVietnameseAddress(
  address: Partial<VietnameseAddressData>,
): address is VietnameseAddressData {
  return vietnameseAddressSchema.safeParse(address).success;
}
