import { 
  downloadEBM, 
  downloadEBMRefund, 
  downloadProformaInvoice,
  downloadAndSavePDF,
  autoDownloadEBM,
  getEBMPDF,
  distributeEBM,
  type EBMDistributionRequest
} from '../chargingSessions'

// Mock the api module
const mockGet = jest.fn()
const mockPost = jest.fn()

jest.mock('../api', () => {
  return jest.fn(() => ({
    get: mockGet,
    post: mockPost,
  }))
})

describe('EBM Functions', () => {
  const mockSessionId = 'test-session-id-123'
  const mockPdfBlob = new Blob(['%PDF-1.4 fake pdf content'], { type: 'application/pdf' })
  const mockLargePdfBlob = new Blob([new ArrayBuffer(5000)], { type: 'application/pdf' })

  // Helper to create a mock JSON blob with text() method
  const createMockJsonBlob = (jsonData: any) => {
    const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' })
    // Add text() method to the blob
    ;(blob as any).text = jest.fn().mockResolvedValue(JSON.stringify(jsonData))
    return blob
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockClear()
    mockPost.mockClear()
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
    // Mock document.createElement and DOM methods
    const mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: jest.fn(),
    }
    document.createElement = jest.fn(() => mockLink as any)
    document.body.appendChild = jest.fn()
    document.body.removeChild = jest.fn()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('downloadEBM', () => {
    it('should successfully download EBM PDF', async () => {
      mockGet.mockResolvedValue({
        data: mockLargePdfBlob,
        status: 200,
      })

      const result = await downloadEBM(mockSessionId)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(100)
      expect(mockGet).toHaveBeenCalledWith(
        `/api/ebm/session/${mockSessionId}`,
        expect.objectContaining({
          responseType: 'blob',
        })
      )
    })

    it('should handle corruption and regenerate EBM', async () => {
      const corruptedBlob = new Blob(['corrupted'], { type: 'application/pdf' })
      const regeneratedBlob = mockLargePdfBlob

      // First attempt returns corrupted blob (too small)
      mockGet
        .mockResolvedValueOnce({
          data: corruptedBlob,
          status: 200,
        })
        .mockResolvedValueOnce({
          data: regeneratedBlob,
          status: 200,
        })

      const result = await downloadEBM(mockSessionId)

      expect(result).toBeInstanceOf(Blob)
      expect(mockGet).toHaveBeenCalledTimes(2)
    })

    it('should handle 202 status (EBM being prepared)', async () => {
      const jsonErrorBlob = createMockJsonBlob({ message: 'EBM is being prepared' })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 202,
      })

      await expect(downloadEBM(mockSessionId)).rejects.toThrow('Your receipt is being prepared')
    })

    it('should handle 503 status (EBM processing)', async () => {
      const jsonErrorBlob = createMockJsonBlob({ message: 'EBM is processing' })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 503,
      })

      await expect(downloadEBM(mockSessionId)).rejects.toThrow('Your receipt is being prepared')
    })

    it('should throw error for blob too small', async () => {
      const smallBlob = new Blob(['tiny'], { type: 'application/pdf' })

      mockGet.mockResolvedValue({
        data: smallBlob,
        status: 200,
      })

      // The error gets caught and re-thrown, so we just check that it throws
      await expect(downloadEBM(mockSessionId)).rejects.toThrow()
    })

    it('should handle JSON error response', async () => {
      const jsonErrorBlob = createMockJsonBlob({ 
        message: 'Session not found',
        error: 'NOT_FOUND'
      })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 200,
      })

      await expect(downloadEBM(mockSessionId)).rejects.toThrow('Session not found')
    })

    it('should handle network errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(downloadEBM(mockSessionId)).rejects.toThrow('Network error')
    })

    it('should handle 404 error', async () => {
      const jsonErrorBlob = createMockJsonBlob({ message: 'Not found' })
      const error = {
        response: {
          status: 404,
          data: jsonErrorBlob,
        },
      }

      mockGet.mockRejectedValue(error)

      await expect(downloadEBM(mockSessionId)).rejects.toThrow()
    })

    it('should use regenerate parameter on second attempt', async () => {
      const corruptedBlob = new Blob(['corrupted'], { type: 'application/pdf' })
      const regeneratedBlob = mockLargePdfBlob

      mockGet
        .mockResolvedValueOnce({
          data: corruptedBlob,
          status: 200,
        })
        .mockResolvedValueOnce({
          data: regeneratedBlob,
          status: 200,
        })

      await downloadEBM(mockSessionId)

      // Check that regenerate was called with timestamp
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(mockGet).toHaveBeenLastCalledWith(
        expect.stringContaining('regenerate=true'),
        expect.any(Object)
      )
    })
  })

  describe('downloadEBMRefund', () => {
    it('should successfully download EBM refund PDF', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await downloadEBMRefund(mockSessionId, 'CUSTOMER_REQUEST')

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(100)
    })

    it('should use default refund reason code if not provided', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockPost.mockResolvedValue(mockResponse)

      await downloadEBMRefund(mockSessionId)

      expect(mockPost).toHaveBeenCalledWith(
        '/api/ebm/refund',
        {
          sessionId: mockSessionId,
          refundReasonCode: 'OTHER_REASON',
          isTraining: false,
        },
        expect.objectContaining({
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
          },
        })
      )
    })

    it('should handle different refund reason codes', async () => {
      const reasonCodes = ['CUSTOMER_REQUEST', 'ERROR', 'DUPLICATE', 'OTHER_REASON']
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      for (const reasonCode of reasonCodes) {
        mockPost.mockResolvedValue(mockResponse)

        await downloadEBMRefund(mockSessionId, reasonCode)

        expect(mockPost).toHaveBeenCalledWith(
          '/api/ebm/refund',
          expect.objectContaining({
            sessionId: mockSessionId,
            refundReasonCode: reasonCode,
          }),
          expect.objectContaining({
            responseType: 'blob',
            headers: expect.objectContaining({
              'Accept': 'application/pdf',
            }),
          })
        )
      }
    })

    it('should throw error for blob too small', async () => {
      const smallBlob = new Blob(['tiny'], { type: 'application/pdf' })

      mockPost.mockResolvedValue({
        data: smallBlob,
        status: 200,
      })

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('too small')
    })

    it('should handle JSON error response', async () => {
      const jsonErrorBlob = createMockJsonBlob({ 
        message: 'Refund failed',
        error: 'REFUND_ERROR'
      })

      mockPost.mockResolvedValue({
        data: jsonErrorBlob,
        status: 200,
      })

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('Refund failed')
    })

    it('should handle 400 error (Invalid session ID)', async () => {
      const error = {
        response: {
          status: 400,
        },
      }

      mockPost.mockRejectedValue(error)

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('Invalid session ID')
    })

    it('should handle 401 error (Unauthorized)', async () => {
      const error = {
        response: {
          status: 401,
        },
      }

      mockPost.mockRejectedValue(error)

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('Unauthorized')
    })

    it('should handle 403 error (Forbidden)', async () => {
      const error = {
        response: {
          status: 403,
        },
      }

      mockPost.mockRejectedValue(error)

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('Forbidden')
    })

    it('should handle 404 error (Session not found)', async () => {
      const error = {
        response: {
          status: 404,
        },
      }

      mockPost.mockRejectedValue(error)

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('not found')
    })

    it('should handle 500 error (Server error)', async () => {
      const error = {
        response: {
          status: 500,
        },
      }

      mockPost.mockRejectedValue(error)

      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('try again later')
    })

    it('should handle JSON error in error response', async () => {
      // Test that errors without specific status handlers are re-thrown
      const genericError = new Error('Generic network error')
      const axiosError: any = Object.assign(genericError, {
        response: {
          status: 422, // Unprocessable Entity - not specifically handled
        },
        isAxiosError: true,
      })

      mockPost.mockImplementation(() => Promise.reject(axiosError))

      // Should re-throw the original error
      await expect(downloadEBMRefund(mockSessionId)).rejects.toThrow('Generic network error')
    })
  })

  describe('downloadProformaInvoice', () => {
    it('should successfully download Proforma invoice PDF', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockGet.mockResolvedValue(mockResponse)

      const result = await downloadProformaInvoice(mockSessionId)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(100)
    })

    it('should call correct API endpoint', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockGet.mockResolvedValue(mockResponse)

      await downloadProformaInvoice(mockSessionId)

      expect(mockGet).toHaveBeenCalledWith(
        `/api/ebm/proforma/${mockSessionId}`,
        expect.objectContaining({
          responseType: 'blob',
          headers: {
            'Accept': 'application/pdf',
          },
        })
      )
    })

    it('should throw error for blob too small', async () => {
      const smallBlob = new Blob(['tiny'], { type: 'application/pdf' })

      mockGet.mockResolvedValue({
        data: smallBlob,
        status: 200,
      })

      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('too small')
    })

    it('should handle JSON error response', async () => {
      const jsonErrorBlob = createMockJsonBlob({ 
        message: 'Invoice generation failed',
        error: 'INVOICE_ERROR'
      })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 200,
      })

      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('Invoice generation failed')
    })

    it('should handle 400 error (Invalid session ID)', async () => {
      const error = {
        response: {
          status: 400,
        },
      }

      mockGet.mockRejectedValue(error)

      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('Invalid session ID')
    })

    it('should handle 404 error (Session not found)', async () => {
      const error = {
        response: {
          status: 404,
        },
      }

      mockGet.mockRejectedValue(error)

      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('not found')
    })

    it('should handle 500 error (Server error)', async () => {
      const error = {
        response: {
          status: 500,
        },
      }

      mockGet.mockRejectedValue(error)

      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('try again later')
    })

    it('should handle JSON error in error response', async () => {
      // Test that errors without specific status handlers are re-thrown
      const genericError = new Error('Generic network error')
      const axiosError: any = Object.assign(genericError, {
        response: {
          status: 422, // Unprocessable Entity - not specifically handled
        },
        isAxiosError: true,
      })

      mockGet.mockImplementation(() => Promise.reject(axiosError))

      // Should re-throw the original error
      await expect(downloadProformaInvoice(mockSessionId)).rejects.toThrow('Generic network error')
    })
  })

  describe('downloadAndSavePDF', () => {
    it('should create download link and trigger download', async () => {
      const filename = 'test-receipt.pdf'
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: jest.fn(),
      }

      document.createElement = jest.fn(() => mockLink as any)
      document.body.appendChild = jest.fn()
      document.body.removeChild = jest.fn()

      await downloadAndSavePDF(mockPdfBlob, filename)

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockPdfBlob)
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.download).toBe(filename)
      expect(mockLink.style.display).toBe('none')
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  describe('autoDownloadEBM', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should wait 2 seconds then download EBM', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockGet.mockResolvedValue(mockResponse)

      const filename = `EBM_Receipt_${mockSessionId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`

      const downloadPromise = autoDownloadEBM(mockSessionId)

      // Fast-forward time
      jest.advanceTimersByTime(2000)

      await downloadPromise

      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('should throw error if session not paid', async () => {
      const error = new Error('Session must be paid')
      mockGet.mockRejectedValue(error)

      const downloadPromise = autoDownloadEBM(mockSessionId)
      jest.advanceTimersByTime(2000)

      await expect(downloadPromise).rejects.toThrow('EBM will be available after payment processing')
    })

    it('should throw generic error on other failures', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      const downloadPromise = autoDownloadEBM(mockSessionId)
      jest.advanceTimersByTime(2000)

      await expect(downloadPromise).rejects.toThrow('Failed to auto-download EBM')
    })
  })

  describe('getEBMPDF', () => {
    it('should successfully get EBM PDF', async () => {
      const mockResponse = {
        data: mockLargePdfBlob,
        status: 200,
      }

      mockGet.mockResolvedValue(mockResponse)

      const result = await getEBMPDF(mockSessionId)

      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(100)
    })

    it('should handle 202 status (EBM being prepared)', async () => {
      const jsonErrorBlob = createMockJsonBlob({ message: 'EBM is being prepared' })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 202,
      })

      await expect(getEBMPDF(mockSessionId)).rejects.toThrow('Your receipt is being prepared')
    })

    it('should handle 503 status (EBM processing)', async () => {
      const jsonErrorBlob = createMockJsonBlob({ message: 'EBM is processing' })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 503,
      })

      // The actual implementation uses the message from JSON if available
      await expect(getEBMPDF(mockSessionId)).rejects.toThrow('EBM is processing')
    })

    it('should throw error for blob too small', async () => {
      const smallBlob = new Blob(['tiny'], { type: 'application/pdf' })

      mockGet.mockResolvedValue({
        data: smallBlob,
        status: 200,
      })

      await expect(getEBMPDF(mockSessionId)).rejects.toThrow('too small')
    })

    it('should handle JSON error response', async () => {
      const jsonErrorBlob = createMockJsonBlob({ 
        message: 'Failed to load EBM',
        error: 'LOAD_ERROR'
      })

      mockGet.mockResolvedValue({
        data: jsonErrorBlob,
        status: 200,
      })

      await expect(getEBMPDF(mockSessionId)).rejects.toThrow('Failed to load EBM')
    })

    it('should validate PDF content type', async () => {
      // Create a blob that's large enough to pass size check
      const largeBlob = new Blob([new ArrayBuffer(5000)], { type: 'application/pdf' })

      mockGet.mockResolvedValue({
        data: largeBlob,
        status: 200,
      })

      const result = await getEBMPDF(mockSessionId)
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('distributeEBM', () => {
    it('should successfully distribute EBM via email', async () => {
      const request: EBMDistributionRequest = {
        sessionId: mockSessionId,
        email: 'test@example.com',
      }

      const mockResponse = {
        data: {
          status: 'success',
          data: {
            sessionId: mockSessionId,
            ebmUrl: 'https://example.com/ebm.pdf',
            emailSent: true,
            smsSent: false,
          },
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await distributeEBM(request)

      expect(result.data.emailSent).toBe(true)
      expect(result.data.smsSent).toBe(false)
    })

    it('should successfully distribute EBM via SMS', async () => {
      const request: EBMDistributionRequest = {
        sessionId: mockSessionId,
        phone: '+250788123456',
      }

      const mockResponse = {
        data: {
          status: 'success',
          data: {
            sessionId: mockSessionId,
            ebmUrl: 'https://example.com/ebm.pdf',
            emailSent: false,
            smsSent: true,
          },
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await distributeEBM(request)

      expect(result.data.emailSent).toBe(false)
      expect(result.data.smsSent).toBe(true)
    })

    it('should successfully distribute EBM via both email and SMS', async () => {
      const request: EBMDistributionRequest = {
        sessionId: mockSessionId,
        email: 'test@example.com',
        phone: '+250788123456',
      }

      const mockResponse = {
        data: {
          status: 'success',
          data: {
            sessionId: mockSessionId,
            ebmUrl: 'https://example.com/ebm.pdf',
            emailSent: true,
            smsSent: true,
          },
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await distributeEBM(request)

      expect(result.data.emailSent).toBe(true)
      expect(result.data.smsSent).toBe(true)
    })

    it('should handle error response', async () => {
      const request: EBMDistributionRequest = {
        sessionId: mockSessionId,
        email: 'test@example.com',
      }

      const mockResponse = {
        data: {
          status: 'error',
          message: 'Failed to send email',
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      await expect(distributeEBM(request)).rejects.toThrow('Failed to send email')
    })

    it('should use default error message if none provided', async () => {
      const request: EBMDistributionRequest = {
        sessionId: mockSessionId,
        email: 'test@example.com',
      }

      const mockResponse = {
        data: {
          status: 'error',
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      await expect(distributeEBM(request)).rejects.toThrow('Failed to distribute EBM')
    })
  })
})

