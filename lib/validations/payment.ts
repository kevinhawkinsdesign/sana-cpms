export type PaymentMethodType = "MOBILE_MONEY" | "CREDIT_CARD" | "BANK_ACCOUNT" | "VOUCHER" | "OTHER"
export type PaymentMethodStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "INVALID"

export const PAYMENT_METHOD_TYPES: PaymentMethodType[] = ["MOBILE_MONEY", "CREDIT_CARD", "BANK_ACCOUNT", "VOUCHER", "OTHER"]
export const PAYMENT_METHOD_STATUSES: PaymentMethodStatus[] = ["ACTIVE", "INACTIVE", "EXPIRED", "INVALID"]

export const PAYMENT_PROVIDERS = {
  MOBILE_MONEY: ["MTN", "AIRTEL", "TIGO"],
  CREDIT_CARD: ["VISA", "MASTERCARD", "AMEX"],
  BANK_ACCOUNT: ["BPR", "BK", "COGEBANQUE", "EQUITY", "GTBANK"],
  VOUCHER: ["VOUCHER"],
  OTHER: ["OTHER"]
} as const

export const validatePaymentDetails = (type: PaymentMethodType, details: string): boolean => {
  switch (type) {
    case "MOBILE_MONEY":
      // Validate mobile money number format (Rwanda)
      return /^(\+?25[0-9]{9})$/.test(details)
    case "CREDIT_CARD":
      // Basic credit card validation (should be replaced with proper validation)
      return /^[0-9]{16}$/.test(details)
    case "BANK_ACCOUNT":
      // Validate bank account number format
      return /^[0-9]{10,}$/.test(details)
    default:
      return true
  }
}

export const getPaymentMethodPlaceholder = (type: PaymentMethodType): string => {
  switch (type) {
    case "MOBILE_MONEY":
      return "e.g. +250788123456"
    case "CREDIT_CARD":
      return "e.g. 1234567890123456"
    case "BANK_ACCOUNT":
      return "e.g. 1234567890"
    case "VOUCHER":
      return "Enter voucher code"
    default:
      return "Enter payment details"
  }
}

export const getPaymentMethodLabel = (type: PaymentMethodType): string => {
  switch (type) {
    case "MOBILE_MONEY":
      return "Mobile Money Number"
    case "CREDIT_CARD":
      return "Card Number"
    case "BANK_ACCOUNT":
      return "Account Number"
    case "VOUCHER":
      return "Voucher Code"
    default:
      return "Details"
  }
} 