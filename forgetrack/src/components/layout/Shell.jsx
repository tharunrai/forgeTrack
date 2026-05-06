import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const routeTitles = {
  'dashboard': 'Dashboard',
  'attendance': 'Mark Attendance',
  'history': 'Student History',
  'materials': 'Materials',
  'upload': 'Upload CSV',
  'me/attendance': 'My Attendance',
  'me/upcoming': 'Upcoming',
  'me/materials': 'Materials',
};

export function Shell({ children }) {
  const role = localStorage.getItem('role') || 'mentor';
  const location = useLocation();
  const path = location.pathname.substring(1) || 'dashboard';
  const title = routeTitles[path] || (path.charAt(0).toUpperCase() + path.slice(1));

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F0E8] text-black">
      <Sidebar role={role} />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Brutalist header */}
        <header className="h-14 flex items-center justify-between px-8 border-b-[3px] border-black bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-base font-black text-black tracking-tight uppercase font-mono">
              / {title}
            </h1>
            <nav className="hidden md:flex items-center gap-0 text-xs font-mono font-bold">
              <a href="#" className="text-black border-b-[3px] border-black px-3 py-4 uppercase tracking-widest bg-[#FFE600]">Overview</a>
              <a href="#" className="text-gray-500 hover:text-black hover:bg-[#FFE600] px-3 py-4 uppercase tracking-widest transition-colors border-l-[2px] border-black">Notifs</a>
              <a href="#" className="text-gray-500 hover:text-black hover:bg-[#FFE600] px-3 py-4 uppercase tracking-widest transition-colors border-l-[2px] border-black">History</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex relative">
              <input
                type="text"
                className="w-52 bg-white border-[2px] border-black h-9 text-xs pl-4 pr-9 focus:outline-none focus:shadow-[2px_2px_0_#000] font-mono text-black placeholder-gray-400 uppercase tracking-wide transition-all"
                placeholder="Search..."
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>

            {/* Date range btn */}
            <button className="hidden lg:flex h-9 px-3 items-center gap-2 bg-white border-[2px] border-black text-xs font-mono font-bold text-black hover:bg-[#FFE600] transition-colors shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] uppercase tracking-wide">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><rect width="18" height="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              Nov 11–18
            </button>

            {/* Share btn */}
            <button className="h-9 px-4 bg-[#FF3B00] border-[2px] border-black text-white text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
              Share
            </button>

            {/* Avatar */}
            <div className="w-9 h-9 border-[2px] border-black overflow-hidden cursor-pointer shadow-[2px_2px_0_#000]">
              <img src="https://ui-avatars.com/api/?name=Tharun+Rai&background=FFE600&color=000000&bold=true" alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(#00000006 1px, transparent 1px), linear-gradient(90deg, #00000006 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <main className="flex-1 overflow-y-auto px-8 py-7 relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
