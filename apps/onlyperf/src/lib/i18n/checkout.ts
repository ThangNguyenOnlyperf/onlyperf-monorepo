import type { Locale } from "@/lib/shopify/locale";

export interface CheckoutPageCopy {
  title: string;
  instructions: string;
  amountLabel: string;
  paymentCodeLabel: string;
  bankInfoTitle: string;
  bankAccountNumberLabel: string;
  bankAccountNameLabel: string;
  bankBinLabel: string;
  notesTitle: string;
  notes: string[];
}

export interface CheckoutStatusCopy {
  statusLabel: string;
  pending: string;
  paid: string;
  expired: string;
  failed: string;
  countdownLabel: string;
  errorPrefix: string;
}

export interface CheckoutActionsCopy {
  checkoutButton: string;
  checkoutButtonLoading: string;
  checkoutErrorNoCart: string;
  checkoutErrorGeneric: string;
}

export interface CheckoutCopy {
  page: CheckoutPageCopy;
  status: CheckoutStatusCopy;
  actions: CheckoutActionsCopy;
}

const viCopy: CheckoutCopy = {
  page: {
    title: "Thanh toán bằng QR ngân hàng",
    instructions:
      "Vui lòng quét mã QR bên dưới bằng ứng dụng ngân hàng và đảm bảo nội dung chuyển khoản có mã thanh toán chính xác.",
    amountLabel: "Số tiền",
    paymentCodeLabel: "Mã thanh toán",
    bankInfoTitle: "Thông tin tài khoản nhận",
    bankAccountNumberLabel: "Số tài khoản",
    bankAccountNameLabel: "Chủ tài khoản",
    bankBinLabel: "Mã ngân hàng",
    notesTitle: "Lưu ý",
    notes: [
      "Không chỉnh sửa nội dung chuyển khoản.",
      "Vui lòng chuyển chính xác số tiền hiển thị.",
      "Đơn hàng sẽ được xác nhận tự động sau khi nhận tiền.",
    ],
  },
  status: {
    statusLabel: "Trạng thái thanh toán",
    pending: "Đang chờ chuyển khoản",
    paid: "Đã thanh toán",
    expired: "Đã hết hạn",
    failed: "Lỗi",
    countdownLabel: "Thời gian còn lại",
    errorPrefix: "Ghi chú",
  },
  actions: {
    checkoutButton: "Thanh toán",
    checkoutButtonLoading: "Đang chuyển tới thanh toán...",
    checkoutErrorNoCart: "Không tìm thấy giỏ hàng. Vui lòng thử lại.",
    checkoutErrorGeneric:
      "Không thể khởi tạo thanh toán. Vui lòng thử lại trong giây lát.",
  },
};

const enCopy: CheckoutCopy = {
  page: {
    title: "Pay with bank QR",
    instructions:
      "Scan the QR code below with your banking app and keep the transfer message exactly as provided.",
    amountLabel: "Amount",
    paymentCodeLabel: "Payment code",
    bankInfoTitle: "Receiving account",
    bankAccountNumberLabel: "Account number",
    bankAccountNameLabel: "Account name",
    bankBinLabel: "Bank BIN",
    notesTitle: "Notes",
    notes: [
      "Do not edit the transfer message.",
      "Transfer the exact amount shown.",
      "Your order confirms automatically once the payment is received.",
    ],
  },
  status: {
    statusLabel: "Payment status",
    pending: "Waiting for transfer",
    paid: "Payment received",
    expired: "Expired",
    failed: "Error",
    countdownLabel: "Time remaining",
    errorPrefix: "Note",
  },
  actions: {
    checkoutButton: "Checkout",
    checkoutButtonLoading: "Redirecting to payment...",
    checkoutErrorNoCart: "Cart not found. Please try again.",
    checkoutErrorGeneric:
      "Could not start the payment. Please try again shortly.",
  },
};

export function getCheckoutCopy(locale: Locale): CheckoutCopy {
  switch (locale.language) {
    case "VI":
      return viCopy;
    case "EN":
    default:
      return enCopy;
  }
}
