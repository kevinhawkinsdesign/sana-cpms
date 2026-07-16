import React from 'react';

const GenericCard = ({ 
  cardNumber = "XXXX XXXX XXXX XXXX", 
  cardHolder = "Cardholder",
  expiryDate = "00/00",
  isSelected = false,
  onRemove,
  onClick
}) => {
  return (
    <div className="wrapper">
      <div className="container">
        <div 
          className={`card ${isSelected ? 'selected' : ''}`}
          onClick={onClick}
        >
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
          background: linear-gradient(135deg, #4338ca 0%, #3730a3 25%, #1e40af 50%, #fbbf24 75%, #f59e0b 100%);
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
          ring: 4px solid #fbbf24;
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at 70% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        
        .card .remove {
          position: absolute;
          top: 30px;
          right: 30px;
          display: inline-block;
          cursor: pointer;
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
        
        .card .number, .card .owner, .card .expiry {
          display: block;
          position: absolute;
          cursor: default;
          color: white;
          opacity: 1;
          transition: color 0.7s ease-out;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        
        .card .number {
          left: 30px;
          top: 50%;
          transform: translateY(-50%);
          letter-spacing: 6px;
          font-size: 24px;
          font-family: 'Courier New', monospace;
          font-weight: 700;
        }
        
        .card .owner {
          left: 30px;
          bottom: 30px;
          letter-spacing: 1px;
          font-size: 16px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .card .expiry {
          right: 30px;
          bottom: 30px;
          letter-spacing: 2px;
          font-size: 18px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};

export default GenericCard;