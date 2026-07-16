import { adminEndSession, adminForceEndRemoteSession, syncSessionToAirtable } from '../admin'
import { forceCheckInOperator } from '../shifts'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockPatch = jest.fn()

jest.mock('../api', () => jest.fn(() => ({ get: mockGet, post: mockPost, put: mockPut, patch: mockPatch })))

describe('admin session control APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('adminEndSession', () => {
    it('POSTs the end payload to the admin-end endpoint', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'Session ended', data: {} } })

      const result = await adminEndSession('sess-1', { chargedKwh: 24.5, endSoc: 80 })

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/admin-end', { chargedKwh: 24.5, endSoc: 80 })
      expect(result.message).toBe('Session ended')
    })

    it('throws a friendly error from the API error body', async () => {
      mockPost.mockRejectedValue({ response: { data: { message: 'Remote sessions cannot be ended this way' } } })
      await expect(adminEndSession('sess-1', { chargedKwh: 5, endSoc: 50 })).rejects.toThrow(/Remote sessions/)
    })
  })

  describe('adminForceEndRemoteSession', () => {
    it('POSTs with a reason and surfaces the local-close flag', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'force-closed locally', data: { closedLocally: true } } })

      const result = await adminForceEndRemoteSession('sess-1', 'stuck on citrine')

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/admin-force-end-remote', { reason: 'stuck on citrine' })
      expect(result.data.closedLocally).toBe(true)
    })

    it('POSTs an empty body when no reason is given', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'Citrine transaction stopped', data: { closedLocally: false } } })

      await adminForceEndRemoteSession('sess-1')

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/admin-force-end-remote', {})
    })
  })

  describe('syncSessionToAirtable', () => {
    it('POSTs to the sync-airtable endpoint and returns the record id', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'Session created in Airtable', data: { created: 1, updated: 0, airtableId: 'recABC', syncedAt: null, isSynced: true } } })

      const result = await syncSessionToAirtable('sess-1')

      expect(mockPost).toHaveBeenCalledWith('/api/charging-sessions/sess-1/sync-airtable')
      expect(result.data.airtableId).toBe('recABC')
    })

    it('throws a friendly error from the API error body', async () => {
      mockPost.mockRejectedValue({ response: { data: { message: 'Failed to sync this session to Airtable' } } })
      await expect(syncSessionToAirtable('sess-1')).rejects.toThrow(/Failed to sync/)
    })
  })

  describe('forceCheckInOperator', () => {
    it('POSTs the operatorShiftId plus optional comments', async () => {
      mockPost.mockResolvedValue({ data: { status: 'success', message: 'Operator force checked in successfully', data: { report: { id: 'rep-1' } } } })

      const result = await forceCheckInOperator('shift-1', { comments: 'phone died' })

      expect(mockPost).toHaveBeenCalledWith('/api/operator-shift/shift-reports/force-check-in', { operatorShiftId: 'shift-1', comments: 'phone died' })
      expect(result.data.report.id).toBe('rep-1')
    })

    it('throws the API error envelope', async () => {
      mockPost.mockResolvedValue({ data: { status: 'error', message: 'Operator is already checked in for this shift' } })
      await expect(forceCheckInOperator('shift-1')).rejects.toThrow(/already checked in/)
    })
  })
})
