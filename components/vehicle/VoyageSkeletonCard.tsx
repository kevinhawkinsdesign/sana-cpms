import React from 'react';

const VoyageSkeletonCard = () => (
  <div className="w-full animate-pulse">
    <div className="relative overflow-hidden rounded-3xl bg-slate-200/50 backdrop-blur-2xl border border-slate-200/60 shadow-xl">
      <div className="p-2">
        <div className="relative aspect-[4/3] rounded-2xl bg-slate-300/70" />
        <div className="p-2 pt-4">
          <div className="h-6 bg-slate-300/70 rounded-md w-3/4 mb-2" />
          <div className="h-4 bg-slate-300/70 rounded-md w-1/2 mb-4" />
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="h-10 bg-slate-300/70 rounded-xl" />
            <div className="h-10 bg-slate-300/70 rounded-xl" />
          </div>
          <div className="flex items-end justify-between mb-4">
            <div className="h-7 bg-slate-300/70 rounded-md w-1/3" />
            <div className="flex gap-1.5">
              <div className="w-5 h-5 bg-slate-300/70 rounded-full" />
              <div className="w-5 h-5 bg-slate-300/70 rounded-full" />
              <div className="w-5 h-5 bg-slate-300/70 rounded-full" />
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-11 bg-slate-300/70 rounded-xl flex-1" />
            <div className="h-11 bg-slate-300/70 rounded-xl flex-1" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default VoyageSkeletonCard;