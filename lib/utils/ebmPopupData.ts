import type { Session } from '@/lib/api/chargingSessions'

export const buildEbmPopupSessionData = (s: Session | undefined | null) => ({
  session: {
    customerName: (s as any)?.customerName || '',
    customerPhone: (s as any)?.customerPhone || '',
    chargedKwh: s?.chargedKwh || 0,
    startTime: s?.startTime || new Date().toISOString(),
    endTime: (s as any)?.endTime || new Date().toISOString(),
  },
  paymentInfo: {
    amount: s?.totalAmount || 0,
    currency: 'RWF',
    paymentMethod: (s as any)?.paymentMethodEnum,
    paymentMethodEnum: (s as any)?.paymentMethodEnum,
    paymentMethodName: (s as any)?.paymentMethodName,
    validationDetails: {},
  },
})
