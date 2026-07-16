import React from 'react'

interface SectionProps {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
}

export const Section: React.FC<SectionProps> = ({ title, right, children }) => (
  <div>
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{title}</h3>
      {right}
    </div>
    {children}
  </div>
)
