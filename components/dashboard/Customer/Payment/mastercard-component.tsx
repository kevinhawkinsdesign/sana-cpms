import React from 'react';

interface MastercardCardProps {
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  isSelected?: boolean;
  onRemove: () => void;
  onClick: () => void;
}

const MastercardCard = ({ 
  cardNumber = "**** **** **** 4382", 
  cardHolder = "JOHN DOE",
  expiryDate = "12/26",
  isSelected = false,
  onRemove,
  onClick
}: MastercardCardProps) => {
  return (
    <div className="wrapper">
      <div className="container">
        <div 
          className={`card ${isSelected ? 'selected' : ''}`}
          onClick={onClick}
        >
          <span className="logo">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={54}
              height={48}
              viewBox="0 0 48 48"
            >
              {/* Left circle */}
              <path
                fill="#ff9800"
                d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"
              />
              {/* Right circle */}
              <path
                fill="#d50000"
                d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"
              />
              {/* Overlap shape */}
              <path
                fill="#ff3d00"
                d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48s-2.376-8.95-6-11.48 C20.376,15.05,18,19.245,18,24z"
              />
            </svg>
          </span>
          {onRemove && (
            <span className="remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <svg viewBox="0 0 16 16" className="bi bi-trash-fill" fill="currentColor" height={16} width={16} xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z" />
              </svg>
            </span>
          )}
          <span className="number">{cardNumber}</span>
          <span className="owner">{cardHolder}</span>
          <span className="expiry">{expiryDate}</span>
        </div>
      </div>

      <style jsx>{`
        .logo svg {
          height: 48px;
          width: 54px;
        }
        
        ::selection {
          background-color: rgba(0, 0, 0, 0);
        }
        
        .wrapper {
          position: relative;
        }
        
        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
        }
        
        .card {
          background: radial-gradient(ellipse at center, #6b7280 0%, #374151 50%, #1f2937 100%);
          width: 350px;
          height: 220px;
          border-radius: 16px;
          position: relative;
          box-shadow: 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 5px 5px 20px 0px rgba(0, 0, 0, 0.6);
        }
        
        .card.selected {
          ring: 4px solid #ef4444;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          transform: translate(50px, -50px);
          pointer-events: none;
        }
        
        .card .remove, .card .logo {
          position: absolute;
          display: inline-block;
          cursor: pointer;
        }
        
        .card .remove {
          top: 30px;
          right: 30px;
          opacity: 0.8;
          color: white;
          z-index: 10;
          padding: 8px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .card .remove:hover {
          opacity: 1;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .card .logo {
          top: 20px;
          left: 30px;
          opacity: 1;
        }
        
        .card .number, .card .owner, .card .expiry {
          display: block;
          position: absolute;
          cursor: default;
          color: white;
          opacity: 1;
          transition: color 0.7s ease-out;
        }
        
        .card .number {
          left: 30px;
          bottom: 60px;
          letter-spacing: 4px;
          font-size: 22px;
          font-family: 'Courier New', monospace;
          font-weight: 500;
        }
        
        .card .owner {
          left: 30px;
          bottom: 30px;
          letter-spacing: 1px;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .card .expiry {
          right: 30px;
          bottom: 30px;
          letter-spacing: 1px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};

export default MastercardCard;