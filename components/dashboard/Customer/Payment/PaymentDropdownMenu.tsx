import React from 'react';
import { createPortal } from 'react-dom';

const PaymentDropdownMenu = ({ isOpen, onClose, onDelete, position }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onDelete: () => void;
  position: { top: number; right: number; }
}) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div 
        className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg w-32"
        style={{ 
          top: position.top + 40, // Add some offset from the button
          right: position.right,
        }}
      >
        <button
          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </>,
    document.body
  );
};

export default PaymentDropdownMenu; 