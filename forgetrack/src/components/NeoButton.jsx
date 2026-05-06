import React from 'react';

export default function NeoButton({ children, onClick, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`relative font-bold px-6 py-3.5 bg-[#FF3B00] text-white border-[3px] border-black uppercase tracking-widest text-sm shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] active:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 cursor-pointer ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}
