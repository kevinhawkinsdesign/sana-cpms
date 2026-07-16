import { previewSessionEdit, getSessionHistory, updateChargingSession, setSessionPaymentStatus } from '../admin'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPatch = jest.fn()

jest.mock('../api', () => jest.fn(() => ({ get: mockGet, post: mockPost, patch: mockPatch })))

describe('admin session edit API (KAB-146)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('previewSessionEdit', () => {
    it('POSTs to the preview endpoint and returns the payload', async () => {
      const payload = {
        status: 'success',
        message: 'Preview computed',
        data: {
          current: { licensePlate: 'RAA1A', chargedKwh: 10, ratePerKwh: 600, totalAmount: 6000, sessionStatus: 'EBM_ISSUED', paymentMethod: 'MOMO' },
          updated: { licensePlate: 'RAA1A', chargedKwh: 12, ratePerKwh: 600, baseAmount: 7200, discountRate: null, discountAmount: null, totalAmount: 7200, userType: 'GUEST', currency: 'RWF', isInvoicedCustomer: false },
          vehicle: { willCreate: false, existing: null },
          amountChanged: true,
          requiresEbmRefund: true,
        },
      }
      mockPost.mockResolvedValue({ data: payload })

      const result = await previewSessionEdit('sess-1', { chargedKwh: 12 })

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/admin-edit/preview', { chargedKwh: 12 })
      expect(result.data.requiresEbmRefund).toBe(true)
      expect(result.data.updated.totalAmount).toBe(7200)
    })

    it('throws when the API returns an error envelope', async () => {
      mockPost.mockResolvedValue({ data: { status: 'error', message: 'Session not found' } })
      await expect(previewSessionEdit('missing', { chargedKwh: 5 })).rejects.toThrow('Session not found')
    })
  })

  describe('getSessionHistory', () => {
    it('GETs the history endpoint and returns entries', async () => {
      const entry = {
        id: 'log-1',
        action: 'ADMIN_EDIT',
        changes: [{ field: 'chargedKwh', from: 10, to: 12 }],
        ebmRefunded: true,
        ebmReissued: true,
        performedBy: { id: 'u1', name: 'Datch', email: 'datch@gokabisa.com' },
        createdAt: '2026-06-26T09:00:00.000Z',
      }
      mockGet.mockResolvedValue({ data: { status: 'success', message: 'ok', data: { history: [entry] } } })

      const result = await getSessionHistory('sess-1')

      expect(mockGet).toHaveBeenCalledWith('/api/charging-sessions/sess-1/history')
      expect(result.data.history).toHaveLength(1)
      expect(result.data.history[0].changes[0]).toEqual({ field: 'chargedKwh', from: 10, to: 12 })
    })
  })

  describe('updateChargingSession', () => {
    it('PATCHes the recalculate payload and surfaces reconciliation', async () => {
      mockPatch.mockResolvedValue({
        data: {
          status: 'success',
          message: 'Session updated; EBM refunded and corrected EBM re-issued',
          data: { session: { id: 'sess-1' }, reconciliation: { ebmRefunded: true, ebmReissued: true, paymentMethod: 'MOMO' } },
        },
      })

      const result = await updateChargingSession('sess-1', { recalculate: true, licensePlate: 'RAB2B', chargedKwh: 12 })

      expect(mockPatch).toHaveBeenCalledWith('/api/charging-sessions/sess-1', { recalculate: true, licensePlate: 'RAB2B', chargedKwh: 12 })
      expect(result.data.reconciliation?.ebmReissued).toBe(true)
    })

    it('throws a friendly error from the API error body', async () => {
      mockPatch.mockRejectedValue({ response: { data: { message: 'Cannot refund existing EBM' } } })
      await expect(updateChargingSession('sess-1', { recalculate: true })).rejects.toThrow('Cannot refund existing EBM')
    })
  })

  describe('setSessionPaymentStatus', () => {
    it('POSTs a mark-paid request with method + phone', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'MoMo payment requested', data: { paymentResult: {} } } })

      const result = await setSessionPaymentStatus('sess-1', { status: 'PAID', paymentMethod: 'MOMO', phone: '0781234567' })

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/payment-status', { status: 'PAID', paymentMethod: 'MOMO', phone: '0781234567' })
      expect(result.message).toMatch(/MoMo/)
    })

    it('throws the API error (e.g. plate not on a contract)', async () => {
      mockPost.mockResolvedValue({ data: { status: 'error', message: 'This license plate is not on a business contract.' } })
      await expect(setSessionPaymentStatus('sess-1', { status: 'PAID', paymentMethod: 'CONTRACT' })).rejects.toThrow(/not on a business contract/)
    })
  })
})
