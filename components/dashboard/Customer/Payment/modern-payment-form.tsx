import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Smartphone, Wallet, AlertCircle, Lock, X } from 'lucide-react';
import { useAddPaymentMethod, useAddCardPaymentMethod } from '@/lib/api/hooks/usePayments';
import { toast } from 'sonner';

interface ModernPaymentFormProps {
  onClose?: () => void;
}

const ModernPaymentForm = ({ onClose }: ModernPaymentFormProps) => {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'momo' | null>(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolderName: '',
    momoNumber: '',
    isDefault: false
  });
  const [expiryDisplay, setExpiryDisplay] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: addPaymentMethod, isPending: isAddingMomo } = useAddPaymentMethod();
  const { mutate: addCardPaymentMethod, isPending: isAddingCard } = useAddCardPaymentMethod();

  const formatCardNumber = (value) => {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
  };

  const handleInputChange = (field, value) => {
    if (field === 'cardNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 16);
      setFormData(prev => ({ ...prev, [field]: digitsOnly }));
      return;
    }
    
    if (field === 'cvv') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 3);
      setFormData(prev => ({ ...prev, [field]: digitsOnly }));
      return;
    }
    
    if (field === 'expiryDate') {
      let digitsOnly = value.replace(/\D/g, '');
      
      // Update display value
      setExpiryDisplay(value);
      
      if (digitsOnly.length >= 1) {
        const month = digitsOnly.slice(0, 2);
        const year = digitsOnly.slice(2, 4);
        
        setFormData(prev => ({ 
          ...prev, 
          expiryMonth: month || '',
          expiryYear: year ? (year.length === 2 ? `20${year}` : year) : ''
        }));
      } else {
        // Clear the fields if no digits
        setFormData(prev => ({ 
          ...prev, 
          expiryMonth: '',
          expiryYear: ''
        }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    console.log('Form data on submit:', formData);
    console.log('Selected method:', selectedMethod);

    try {
      if (selectedMethod === 'card') {
        // Validate card data
        if (!formData.cardNumber || !formData.expiryMonth || !formData.expiryYear || !formData.cvv || !formData.cardHolderName) {
          console.log('Validation failed:', { 
            cardNumber: !!formData.cardNumber, 
            cardHolderName: !!formData.cardHolderName,
            expiryMonth: !!formData.expiryMonth, 
            expiryYear: !!formData.expiryYear, 
            cvv: !!formData.cvv 
          });
          toast.error('Please fill in all card details');
          setIsLoading(false);
          return;
        }

        console.log('Submitting card data:', {
          cardNumber: formData.cardNumber,
          cardHolderName: formData.cardHolderName,
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv,
          isDefault: formData.isDefault
        });
        
        addCardPaymentMethod({
          cardNumber: formData.cardNumber,
          cardHolderName: formData.cardHolderName,
          expiryMonth: formData.expiryMonth,
          expiryYear: formData.expiryYear,
          cvv: formData.cvv,
          isDefault: formData.isDefault
        }, {
          onSuccess: () => {
            toast.success('Card payment method added successfully!');
            onClose?.();
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to add card payment method');
          }
        });
      } else if (selectedMethod === 'momo') {
        // Validate MOMO data
        if (!formData.momoNumber) {
          toast.error('Please enter your MOMO phone number');
          setIsLoading(false);
          return;
        }

        // Validate phone number format
        const phoneRegex = /^(\+?250)?7\d{8}$/;
        if (!phoneRegex.test(formData.momoNumber.replace(/\s/g, ''))) {
          toast.error('Please enter a valid Rwandan phone number');
          setIsLoading(false);
          return;
        }

        addPaymentMethod({
          paymentMethodType: 'MOMO',
          isDefault: formData.isDefault,
          momoNumber: formData.momoNumber.startsWith('+') ? formData.momoNumber : `+250${formData.momoNumber.replace(/^0/, '')}`
        }, {
          onSuccess: () => {
            toast.success('MOMO payment method added successfully!');
            onClose?.();
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to add MOMO payment method');
          }
        });
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal">
      <form className="form" onSubmit={handleSubmit}>
        {/* Payment Options */}
        <div className="payment-options">
          <button
            type="button"
            className={`payment-option ${selectedMethod === 'card' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('card')}
          >
            <CreditCard className="payment-icon" />
            <span>Credit Card</span>
          </button>
          
          <button
            type="button"
            className={`payment-option ${selectedMethod === 'momo' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('momo')}
          >
            <Smartphone className="payment-icon" />
            <span>Mobile Money (MOMO)</span>
          </button>
        </div>

        {selectedMethod && (
          <>
            {/* Separator */}
            <div className="separator">
              <hr className="line" />
              <p>Enter your {selectedMethod === 'card' ? 'card' : 'MOMO'} details</p>
              <hr className="line" />
            </div>

            {/* Form Fields */}
            <div className="form-fields">
              {selectedMethod === 'card' && (
                <>
                  <div className="input-container">
                    <label className="input-label">Card holder full name</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.cardHolderName || ''}
                      onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="input-container">
                    <label className="input-label">Card Number</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      value={formatCardNumber(formData.cardNumber || '')}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      maxLength={19}
                      required
                    />
                  </div>
                  
                  <div className="input-container">
                    <label className="input-label">Expiry Date / CVV</label>
                    <div className="split">
                      <input
                        className="input-field"
                        type="text"
                        placeholder="MM/YY"
                        value={expiryDisplay}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        maxLength={5}
                        required
                      />
                      <div className="cvv-container">
                        <input
                          className="input-field"
                          type="text"
                          placeholder="CVV"
                          value={formData.cvv || ''}
                          onChange={(e) => handleInputChange('cvv', e.target.value)}
                          maxLength={3}
                          required
                        />
                        <AlertCircle className="cvv-info" title="3-digit security code on the back of your card" />
                      </div>
                    </div>
                  </div>
                  

                </>
              )}

              {selectedMethod === 'momo' && (
                <>
                  <div className="input-container">
                    <label className="input-label">MOMO Phone Number</label>
                    <input
                      className="input-field"
                      type="tel"
                      placeholder="07X XXX XXXX"
                      value={formData.momoNumber || ''}
                      onChange={(e) => handleInputChange('momoNumber', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="provider-info">
                    <p>We'll automatically detect your provider (MTN, Airtel)</p>
                  </div>
                </>
              )}

              {/* Default Payment Method Checkbox */}
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault || false}
                  onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isDefault" className="checkbox-label">
                  Set as default payment method
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Add Payment Method'}
            </button>

            {/* Security Notice */}
            <div className="security-notice">
              <Lock className="security-icon" />
              <p>Your payment information is secure and encrypted</p>
            </div>
          </>
        )}
      </form>

      <style jsx>{`
        .modal {
          width: 100%;
          max-width: 480px;
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0px 187px 75px rgba(0, 0, 0, 0.01), 
                      0px 105px 63px rgba(0, 0, 0, 0.05), 
                      0px 47px 47px rgba(0, 0, 0, 0.09), 
                      0px 12px 26px rgba(0, 0, 0, 0.1);
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 32px;
        }

        .payment-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .payment-option {
          height: 100px;
          background: #F8F9FA;
          border: 2px solid #E9ECEF;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          font-weight: 600;
          color: #495057;
        }

        .payment-option:hover {
          background: #F1F3F4;
          border-color: #DEE2E6;
          transform: translateY(-2px);
        }

        .payment-option.selected {
          background: #E3F2FD;
          border-color: #2196F3;
          color: #1976D2;
          box-shadow: 0 4px 12px rgba(33, 150, 243, 0.15);
        }

        .payment-icon {
          width: 32px;
          height: 32px;
        }

        .separator {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          align-items: center;
          color: #6C757D;
          margin: 8px 0;
        }

        .separator p {
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .line {
          height: 1px;
          border: 0;
          background: linear-gradient(to right, transparent, #DEE2E6, transparent);
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .input-label {
          font-size: 12px;
          color: #495057;
          font-weight: 600;
          margin-left: 4px;
        }

        .input-field {
          height: 48px;
          padding: 0 16px;
          border-radius: 12px;
          border: 2px solid #E9ECEF;
          background: #F8F9FA;
          font-size: 14px;
          transition: all 0.3s ease;
          outline: none;
        }

        .input-field:focus {
          border-color: #2196F3;
          background: #FFFFFF;
          box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.1);
        }

        .input-field::placeholder {
          color: #ADB5BD;
        }

        .split {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 12px;
        }

        .cvv-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cvv-info {
          position: absolute;
          right: 12px;
          width: 16px;
          height: 16px;
          color: #6C757D;
          cursor: help;
        }

        .provider-info {
          text-align: center;
          margin: 8px 0;
        }

        .provider-info p {
          font-size: 12px;
          color: #6C757D;
          background: #F8F9FA;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 0;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid #DEE2E6;
          cursor: pointer;
        }

        .checkbox:checked {
          background: #2196F3;
          border-color: #2196F3;
        }

        .checkbox-label {
          font-size: 14px;
          color: #495057;
          cursor: pointer;
        }

        .submit-btn {
          height: 56px;
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          border: none;
          border-radius: 16px;
          color: white;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(33, 150, 243, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(33, 150, 243, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .security-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .security-notice p {
          font-size: 12px;
          color: #6C757D;
          margin: 0;
        }

        .card-preview {
          display: flex;
          justify-content: center;
          margin: 24px 0 16px 0;
        }

        .card-wrapper {
          position: relative;
        }

        .generic-card {
          background: linear-gradient(135deg, #4338ca 0%, #3730a3 25%, #1e40af 50%, #fbbf24 75%, #f59e0b 100%);
          width: 350px;
          height: 220px;
          border-radius: 16px;
          position: relative;
          box-shadow: 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
          cursor: default;
          transition: all 0.3s ease;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 30px;
        }

        .generic-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at 70% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
          pointer-events: none;
        }

        .generic-card .card-number {
          position: absolute;
          left: 30px;
          top: 50%;
          transform: translateY(-50%);
          letter-spacing: 6px;
          font-size: 24px;
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: white;
          opacity: 1;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .generic-card .card-owner {
          position: absolute;
          left: 30px;
          bottom: 30px;
          letter-spacing: 1px;
          font-size: 16px;
          font-weight: 600;
          text-transform: capitalize;
          color: white;
          opacity: 1;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .generic-card .card-expiry {
          position: absolute;
          right: 30px;
          bottom: 30px;
          letter-spacing: 2px;
          font-size: 18px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          color: white;
          opacity: 1;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .form {
            padding: 24px 20px;
          }

          .payment-options {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .payment-option {
            height: 60px;
            flex-direction: row;
            gap: 12px;
            justify-content: flex-start;
            padding-left: 20px;
          }

          .split {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ModernPaymentForm;