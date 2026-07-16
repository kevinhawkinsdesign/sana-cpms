import React from 'react';

const KabisaCard = ({ 
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
          
          {/* Kabisa Double Arrow Logo */}
          <div className="logo">
            <svg viewBox="0 0 192 120" width={96} height={60}>
              {/* small arrow, scaled down */}
              <g transform="translate(0, 24) scale(0.6)">
                <polygon
                  fill="#FFD400"
                  points="0,50 40,10 40,35 100,35 100,65 40,65 40,90"
                />
              </g>
              {/* big arrow */}
              <g transform="translate(36, 0)">
                <polygon
                  fill="#FFD400"
                  points="0,50 40,10 40,35 100,35 100,65 40,65 40,90"
                />
              </g>
            </svg>
          </div>
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
          background: #000000;
          width: 350px;
          height: 220px;
          border-radius: 16px;
          position: relative;
          box-shadow: 3px 3px 17px 0px rgba(0, 0, 0, 0.75);
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          border: 1px solid #1a1a1a;
        }
        
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 5px 5px 25px 0px rgba(0, 0, 0, 0.8);
        }
        
        .card.selected {
          ring: 4px solid #FFD400;
          box-shadow: 0 0 0 4px rgba(255, 212, 0, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.75);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at 30% 20%, rgba(255, 212, 0, 0.05) 0%, transparent 60%);
          pointer-events: none;
        }
        
        .card .remove {
          position: absolute;
          top: 30px;
          right: 30px;
          display: inline-block;
          cursor: pointer;
          opacity: 0.7;
          color: #FFD400;
          z-index: 10;
          padding: 8px;
          border-radius: 50%;
          background: rgba(255, 212, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .card .remove:hover {
          opacity: 1;
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        
        .card .logo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default KabisaCard;