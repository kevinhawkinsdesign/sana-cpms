import React from 'react';

const MTNCard = ({ 
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
          
          {/* Large MTN Logo */}
          <div className="logo">
            <svg
              width={180}
              height={120}
              viewBox="0 0 1920 1280"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* main oval + MTN letters */}
              <path
                fill="#000000"
                d="M960,320c-353.46,0-640,143.27-640,320S606.54,960,960,960s640-143.27,640-320S1313.46,320,960,320Zm0,589.48c-325.56,0-589.48-120.65-589.48-269.48S634.44,370.52,960,370.52,1549.48,491.17,1549.48,640,1285.56,909.48,960,909.48ZM879.29,583.86V533.33h180.55v50.53h-65V746.67H944.3V583.86Zm398.49-50.53V746.67h-50.52l-91.63-127v127h-50.52V533.33h50.52l91.63,127v-127ZM640.72,746.67V533.33h50.52l56.13,86.34,56.13-86.34H854V746.67H803.5V626L765.18,684.9H729.56L691.24,626V746.67Z"
              />
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
          background: radial-gradient(ellipse at center, #FFEB3B 0%, #FFC107 30%, #FF9800 60%, #FF6F00 100%);
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
          ring: 4px solid #FFC107;
          box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.3), 3px 3px 17px 0px rgba(0, 0, 0, 0.55);
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .card .remove {
          position: absolute;
          top: 30px;
          right: 30px;
          display: inline-block;
          cursor: pointer;
          opacity: 0.8;
          color: #000;
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

export default MTNCard;