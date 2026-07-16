import React from 'react';

const DiscoverCard = ({ 
  cardNumber = "**** **** **** 2023", 
  cardHolder = "JANE SMITH",
  expiryDate = "08/28",
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
          <span className="logo">
            <svg viewBox="0 0 200 50" width={120} height={30}>
              <defs>
                <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F9A021" />
                  <stop offset="100%" stopColor="#E55C20" />
                </radialGradient>
              </defs>
              {/* Orange "O" circle */}
              <circle cx="75" cy="25" r="12" fill="url(#discGrad)" />
              {/* "DISC" to the left and "VER" to the right */}
              <text x="0" y="32" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#333">
                DISC
              </text>
              <text x="95" y="32" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="28" fill="#333">
                VER
              </text>
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
          height: 30px;
          width: 120px;
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
          background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 30%, #60a5fa 70%, #3b82f6 100%);
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
          ring: 4px solid #f97316;
          box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
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
          color: #333;
          z-index: 10;
          padding: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
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
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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

export default DiscoverCard;