import React from 'react';

const VisaCard = ({ 
  cardNumber = "**** **** **** 6594", 
  cardHolder = "DAVID S.",
  expiryDate = "04/27",
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
            <svg viewBox="0 0 256 83" height={83} width={256} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient y2="100%" y1="-2.006%" x2="54.877%" x1="45.974%" id="logosVisa0">
                  <stop stopColor="#ffffff" offset="0%" />
                  <stop stopColor="#ffffff" offset="100%" />
                </linearGradient>
              </defs>
              <path 
                transform="matrix(1 0 0 -1 0 82.668)" 
                d="M132.397 56.24c-.146-11.516 10.263-17.942 18.104-21.763c8.056-3.92 10.762-6.434 10.73-9.94c-.06-5.365-6.426-7.733-12.383-7.825c-10.393-.161-16.436 2.806-21.24 5.05l-3.744-17.519c4.82-2.221 13.745-4.158 23-4.243c21.725 0 35.938 10.724 36.015 27.351c.085 21.102-29.188 22.27-28.988 31.702c.069 2.86 2.798 5.912 8.778 6.688c2.96.392 11.131.692 20.395-3.574l3.636 16.95c-4.982 1.814-11.385 3.551-19.357 3.551c-20.448 0-34.83-10.87-34.946-26.428m89.241 24.968c-3.967 0-7.31-2.314-8.802-5.865L181.803 1.245h21.709l4.32 11.939h26.528l2.506-11.939H256l-16.697 79.963h-17.665m3.037-21.601l6.265-30.027h-17.158l10.893 30.027m-118.599 21.6L88.964 1.246h20.687l17.104 79.963h-20.679m-30.603 0L53.941 26.782l-8.71 46.277c-1.022 5.166-5.058 8.149-9.54 8.149H.493L0 78.886c7.226-1.568 15.436-4.097 20.41-6.803c3.044-1.653 3.912-3.098 4.912-7.026L41.819 1.245H63.68l33.516 79.963H75.473" 
                fill="url(#logosVisa0)" 
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
          background: linear-gradient(135deg, #4338ca 0%, #3b82f6 50%, #1e40af 100%);
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
          ring: 4px solid #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
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

export default VisaCard;