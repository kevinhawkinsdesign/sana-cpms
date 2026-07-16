"use client";

import React, { createContext, useContext, useState } from 'react';

interface MobileNavContextType {
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export const MobileNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <MobileNavContext.Provider value={{ isMobileNavOpen, setMobileNavOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
};

export const useMobileNav = () => {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used within a MobileNavProvider');
  return ctx;
}; 