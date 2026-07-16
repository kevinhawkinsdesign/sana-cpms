'use client';

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Star, StarOff } from 'lucide-react';
import { useUserDashboardPaymentMethods } from '@/lib/api/hooks/useUserDashboard';
import { useAddPaymentMethod, useAddCardPaymentMethod, useSetDefaultPaymentMethod, useDeletePaymentMethod, PaymentMethod } from '@/lib/api/hooks/usePayments';
import { toast } from 'sonner';

// Import the actual card components
import VisaCard from '../Payment/visa-card-component';
import MastercardCard from '../Payment/mastercard-component';
import DiscoverCard from '../Payment/discover-card-component';
import GenericCard from '../Payment/generic-card-component';
import KabisaCard from '../Payment/kabisa-card-component';
import MTNCard from '../Payment/mtn-card-component';
import ModernPaymentForm from '../Payment/modern-payment-form';

interface PaymentMethodsSectionProps {
  balance?: {
    balance: number;
    currency: string;
  };
}

export function PaymentMethodsSection({ balance }: PaymentMethodsSectionProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Use the new backend API hooks
  const { data: paymentMethods = [], isLoading, error } = useUserDashboardPaymentMethods();
  const { mutate: addPaymentMethod, isPending: isAdding } = useAddPaymentMethod();
  const { mutate: addCardPaymentMethod, isPending: isAddingCard } = useAddCardPaymentMethod();
  const { mutate: setDefaultPaymentMethod, isPending: isSettingDefault } = useSetDefaultPaymentMethod();
  const { mutate: deletePaymentMethod, isPending: isDeleting } = useDeletePaymentMethod();

  // Set the first payment method as selected by default
  React.useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentMethod]);

  const handlePaymentMethodClick = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
  };

  const handleSetDefault = (methodId: string) => {
    setDefaultPaymentMethod(methodId);
  };

  const handleDelete = (methodId: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      deletePaymentMethod(methodId);
    }
  };

  const getPaymentMethodComponent = (method: PaymentMethod) => {
    const paymentType = method.paymentMethodType;
    
    switch (paymentType) {
      case 'CARD':
        // Determine card type based on provider name or token
        if (method.paymentProviderName?.toLowerCase().includes('visa')) {
          return VisaCard;
        } else if (method.paymentProviderName?.toLowerCase().includes('mastercard')) {
          return MastercardCard;
        } else {
          return GenericCard;
        }
      case 'MOMO':
        return MTNCard;
      case 'KABISA':
        return KabisaCard;
      default:
        return GenericCard;
    }
  };

  const getPaymentMethodDisplayInfo = (method: PaymentMethod) => {
    const paymentType = method.paymentMethodType;
    
    switch (paymentType) {
      case 'CARD':
        return {
          name: method.paymentProviderName || 'Card',
          details: `Card ••${method.flutterwaveCardToken?.slice(-4) || '****'}`,
          cardProps: {
            cardNumber: "•••• •••• •••• " + (method.flutterwaveCardToken?.slice(-4) || '****'),
            cardHolder: method.paymentProviderName?.toUpperCase() || "CARD",
            expiryDate: "12/25" // This would come from the card data
          }
        };
      case 'MOMO':
        return {
          name: method.paymentProviderName || 'Mobile Money',
          details: `MOMO ${method.momoNumber ? method.momoNumber.replace('+250', '0') : '****'}`,
          cardProps: {
            cardNumber: method.momoNumber || "•••• •••• ••••",
            cardHolder: "MOBILE MONEY",
            expiryDate: "N/A"
          }
        };
      case 'CONTRACT':
        return {
          name: 'Business Contract',
          details: `Contract ${method.businessPaymentContractId?.slice(0, 8) || '****'}...`,
          cardProps: {
            cardNumber: "•••• •••• ••••",
            cardHolder: "BUSINESS CONTRACT",
            expiryDate: "N/A"
          }
        };
      default:
        return {
          name: paymentType,
          details: 'Payment Method',
          cardProps: {
            cardNumber: "•••• •••• ••••",
            cardHolder: paymentType.toUpperCase(),
            expiryDate: "N/A"
          }
        };
    }
  };

  const selectedMethod = paymentMethods.find((method: PaymentMethod) => method.id === selectedPaymentMethod);
  const SelectedCardComponent = selectedMethod ? getPaymentMethodComponent(selectedMethod) : null;
  const selectedMethodInfo = selectedMethod ? getPaymentMethodDisplayInfo(selectedMethod) : null;

  if (isLoading) {
    return null
  }

  if (error) {
    return (
      <div className="paypal-wallet-container">
        <div className="wallet-grid">
          <div className="method-list">
            <div className="text-center py-8">
              <p className="text-red-600">Error loading payment methods</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="paypal-wallet-container">
      <div className="wallet-grid">
        {/* List Column */}
        <aside className="method-list">
          {/* Link Card CTA */}
          <div 
            className="link-card-cta"
            onClick={() => setShowAddForm(true)}
          >
            <div className="cta-icon">
              <Plus size={24} />
            </div>
            <div className="cta-text">Link a card</div>
          </div>

          {/* Payment List */}
          <div className="payment-list">
            {paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No payment methods yet</p>
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="text-blue-600 hover:underline"
                >
                  Add your first payment method
                </button>
              </div>
            ) : (
              paymentMethods.map((method: PaymentMethod) => {
                const isSelected = selectedPaymentMethod === method.id;
                const methodInfo = getPaymentMethodDisplayInfo(method);
                
                return (
                  <div
                    key={method.id}
                    className={`payment-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => handlePaymentMethodClick(method.id)}
                  >
                    {/* Card Thumbnail */}
                    <div className={`card-thumbnail ${method.paymentMethodType.toLowerCase()}`}>
                      {method.paymentMethodType === 'CARD' && (
                        method.paymentProviderName?.toLowerCase().includes('visa') ? 'VISA' :
                        method.paymentProviderName?.toLowerCase().includes('mastercard') ? 'MC' : '💳'
                      )}
                      {method.paymentMethodType === 'MOMO' && '📱'}
                      {method.paymentMethodType === 'CONTRACT' && '🏢'}
                      {method.paymentMethodType === 'KABISA' && '⚡'}
                    </div>

                    {/* Payment Info */}
                    <div className="payment-info">
                      <div className="provider-name">{methodInfo.name}</div>
                      <div className="card-meta">{methodInfo.details}</div>
                    </div>

                    {/* Default Badge */}
                    {method.isDefault && (
                      <div className="preferred-pill">DEFAULT</div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-1 ml-auto">
                      {!method.isDefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(method.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                          disabled={isSettingDefault}
                        >
                          <Star className="h-3 w-3 text-gray-400" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(method.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-red-500"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Details Column */}
        <section className="method-details">
          {selectedMethod && selectedMethodInfo && (
            <>
              {/* Scaled Card Visual */}
              <div className="card-visual">
                {SelectedCardComponent && (
                  <SelectedCardComponent
                    {...selectedMethodInfo.cardProps}
                    isSelected={true}
                    onRemove={() => {}}
                    onClick={() => {}}
                  />
                )}
              </div>

              {/* Card Nickname Row */}
              <div className="card-nickname-row">
                <span>{selectedMethodInfo.name}</span>
                <span className="pencil-icon">
                  <Edit2 size={12} />
                </span>
              </div>

              {/* Card Details */}
              <div className="card-details">
                <div className="detail-block">
                  <div className="detail-label">Payment Method</div>
                  <div className="detail-value">
                    {selectedMethodInfo.name}
                  </div>
                  <div className="detail-value-light">{selectedMethodInfo.details}</div>
                </div>
                
                {selectedMethod.paymentMethodType === 'MOMO' && selectedMethod.momoNumber && (
                  <div className="detail-block">
                    <div className="detail-label">Phone Number</div>
                    <div className="detail-value">
                      {selectedMethod.momoNumber.replace('+250', '0')}
                    </div>
                  </div>
                )}

                {selectedMethod.paymentMethodType === 'CONTRACT' && selectedMethod.businessPaymentContractId && (
                  <div className="detail-block">
                    <div className="detail-label">Contract ID</div>
                    <div className="detail-value">
                      {selectedMethod.businessPaymentContractId.slice(0, 8)}...
                    </div>
                  </div>
                )}
              </div>

              {/* Preference Section */}
              <div className="preference-section">
                <div className="preference-title">Default payment method</div>
                <div className="preference-actions">
                  <button 
                    onClick={() => handleSetDefault(selectedMethod.id)}
                    className={`preference-link ${selectedMethod.isDefault ? 'active' : ''}`}
                    disabled={isSettingDefault}
                  >
                    {selectedMethod.isDefault ? '✓ Set as default' : 'Set as default'}
                  </button>
                </div>
                <div className="preference-subtext">
                  We'll use this when you shop or send money for goods and services.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="footer-actions">
                <button 
                  onClick={() => setShowAddForm(true)}
                  className="action-link"
                >
                  Update method
                </button>
                <button 
                  onClick={() => handleDelete(selectedMethod.id)}
                  className="action-link text-red-600"
                  disabled={isDeleting}
                >
                  Remove method
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Modern Payment Form Modal */}
      {showAddForm && (
        <div 
          className="overlay"
          onClick={(e) => e.target === e.currentTarget && setShowAddForm(false)}
          role="dialog"
          aria-modal="true"
        >
          <ModernPaymentForm onClose={() => setShowAddForm(false)} />
          <button
            className="overlay-close"
            onClick={() => setShowAddForm(false)}
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        .paypal-wallet-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fff;
          color: #333;
          padding: 48px 0;
        }

        /* 1. Perfect PayPal Grid Layout */
        .wallet-grid {
          display: grid;
          grid-template-columns: 260px 1fr;  /* PayPal's exact proportions */
          gap: 64px;                         /* PayPal's breathing room */
          max-width: 1040px;                 /* centres nicely on desktop */
          margin: 0 auto;
          padding: 0 24px;                   /* responsive padding */
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .wallet-grid {
            grid-template-columns: 1fr;      /* stack on tablet */
            gap: 32px;
            max-width: 600px;
          }
          
          .method-list {
            order: 2;                        /* move list below details on mobile */
          }
          
          .method-details {
            order: 1;                        /* details first on mobile */
          }
        }

        @media (max-width: 768px) {
          .paypal-wallet-container {
            padding: 24px 0;
          }
          
          .wallet-grid {
            gap: 24px;
            padding: 0 16px;
          }
          
          .card-visual {
            transform: scale(.8);            /* slightly smaller on tablet */
          }
        }

        @media (max-width: 480px) {
          .wallet-grid {
            padding: 0 12px;
          }
          
          .card-visual {
            transform: scale(.75);           /* smaller card on mobile */
          }
          
          .payment-row {
            padding: 16px 12px;              /* more touch-friendly */
            margin-bottom: 16px;
          }
          
          .card-thumbnail {
            width: 40px;                     /* smaller thumbnails on mobile */
            height: 28px;
            margin-right: 12px;
          }
          
          .provider-name {
            font-size: 16px;                 /* larger text for mobile */
          }
          
          .card-meta {
            font-size: 14px;
          }
          
          .card-details {
            padding-left: 16px;              /* less padding on mobile */
          }
          
          .preference-section {
            padding-left: 16px;              /* less padding on mobile */
          }
          
          .preference-actions {
            text-align: left;                /* left align on mobile */
          }
          
          .footer-actions {
            justify-content: flex-start;     /* left align on mobile */
            gap: 16px;
          }
        }

        /* Left Column Styling */
        .method-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .link-card-cta {
          text-align: center;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .cta-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #0070ba;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          color: white;
        }

        .cta-text {
          font-size: 12px;
          color: #333;
        }

        .payment-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .payment-row {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          margin-bottom: 24px;
        }

        .payment-row.selected {
          border: 2px solid #003087;
          background: #f2f6ff;
        }

        .payment-row:hover {
          background: #f8f9fa;
        }

        /* 4. Compact PayPal-sized Thumbnails */
        .card-thumbnail {
          width: 48px;                       /* PayPal sizing */
          height: 34px;                      /* PayPal sizing */
          border-radius: 4px;
          background: #d7d8db;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;                   /* compact text */
          line-height: 1;
          font-weight: bold;
          color: white;
        }

        .card-thumbnail.card {
          background: linear-gradient(135deg, #1a1f71 0%, #003087 100%);
        }

        .card-thumbnail.momo {
          background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
        }

        .card-thumbnail.contract {
          background: linear-gradient(135deg, #eb001b 0%, #ff6900 100%);
        }

        .card-thumbnail.kabisa {
          background: linear-gradient(135deg, #003087 0%, #0070ba 100%);
        }

        .payment-info {
          flex: 1;
        }

        .provider-name {
          font-size: 14px;
          font-weight: bold;
          color: #0070ba;
          margin-bottom: 2px;
        }

        .card-meta {
          font-size: 12px;
          color: #666;
        }

        .preferred-pill {
          position: absolute;
          top: 50%;                          /* vertical center */
          transform: translateY(-50%);       /* perfect centering */
          left: 96px;
          background: #28a745;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        /* Right Column Styling */
        .method-details {
          max-width: 420px;
        }

        /* 2. Scaled Card Visual */
        .card-visual {
          transform: scale(.85);             /* ~300 × 190-ish like PayPal */
          transform-origin: top left;
          margin-bottom: 16px;
        }

        /* 3. Tidy Text & Button Alignment */
        .card-nickname-row {
          display: flex;                     /* left-aligned with card */
          gap: 4px;
          padding-left: 28px;                /* align with card visual */
          font-size: 14px;
          color: #003087;
          margin-bottom: 16px;
          align-items: center;
        }

        .pencil-icon {
          cursor: pointer;
          color: #666;
        }

        .card-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
          padding-left: 28px;                /* align with card visual */
        }

        .detail-block {
          display: flex;
          flex-direction: column;
        }

        .detail-label {
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          font-weight: bold;
          color: #333;
        }

        .detail-value-light {
          font-size: 12px;
          color: #555;
          font-weight: 400;
        }

        .preference-section {
          margin-bottom: 12px;
          padding-left: 28px;                /* align with card visual */
        }

        .preference-title {
          font-size: 14px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
        }

        .preference-actions {
          text-align: right;                 /* flush right alignment */
          margin-bottom: 8px;
        }

        .preference-link {
          color: #0070ba;
          text-decoration: none;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
        }

        .preference-link:hover {
          text-decoration: underline;
        }

        .preference-link.active {
          color: #28a745;
          font-weight: 600;
        }

        .preference-subtext {
          font-size: 11px;
          color: #666;
          margin-bottom: 8px;
        }

        /* 3. Footer Actions - Flush Right, 32px Apart */
        .footer-actions {
          display: flex;
          justify-content: flex-end;         /* flush right */
          gap: 32px;                         /* 32px apart */
        }

        .action-link {
          color: #0070ba;
          text-decoration: none;
          font-size: 14px;
          background: none;
          border: none;
          cursor: pointer;
        }

        .action-link:hover {
          text-decoration: underline;
        }

        /* 5. Responsive Tweak */
        @media (max-width: 768px) {
          .wallet-grid {
            grid-template-columns: 1fr;     /* single column */
            gap: 24px;
          }
          
          .method-list {
            order: 2;                        /* details first on mobile */
          }

          .method-details {
            order: 1;
            max-width: 100%;
          }

          .card-visual {
            transform: scale(.75);           /* smaller on mobile */
          }
        }

        /* Modal Overlay Styles */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, .5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .overlay-close {
          position: absolute;
          top: 24px;
          right: 24px;
          font-size: 24px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}