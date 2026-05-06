import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Users, BookOpen, Upload, UserCheck, Calendar, LogOut, Settings } from 'lucide-react';

export function Sidebar({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 border-[2px] transition-all duration-100 font-mono font-bold text-sm uppercase tracking-wide ${
      isActive
        ? 'bg-black text-white border-black shadow-[3px_3px_0_#FF3B00]'
        : 'bg-transparent text-black border-transparent hover:border-black hover:bg-[#FFE600] hover:shadow-[2px_2px_0_#000]'
    }`;

  return (
    <aside className="w-64 h-screen bg-[#F5F0E8] border-r-[3px] border-black flex flex-col flex-shrink-0 relative z-20">
      {/* Logo */}
      <div className="p-5 border-b-[3px] border-black bg-black">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#FF3B00] border-[2px] border-white flex items-center justify-center font-black text-white text-lg">F</div>
          <span className="font-black text-xl text-white tracking-tight uppercase">
            Forge<span className="text-[#FFE600]">Track</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5 custom-scrollbar">
        {role === 'mentor' && (
          <>
            <div>
              <p className="text-[10px] text-gray-500 mb-2 font-mono font-bold uppercase tracking-widest border-b-2 border-black pb-1">
                // Overview
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <NavLink to="/dashboard" className={navClass}>
                  <LayoutDashboard size={16} strokeWidth={2.5} />
                  <span>Dashboard</span>
                </NavLink>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-2 font-mono font-bold uppercase tracking-widest border-b-2 border-black pb-1">
                // Activity
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <NavLink to="/attendance" className={navClass}>
                  <CheckSquare size={16} strokeWidth={2.5} />
                  <span>Attendance</span>
                </NavLink>
                <NavLink to="/history" className={navClass}>
                  <Users size={16} strokeWidth={2.5} />
                  <span>Std. History</span>
                </NavLink>
                <NavLink to="/materials" className={navClass}>
                  <BookOpen size={16} strokeWidth={2.5} />
                  <span>Materials</span>
                </NavLink>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-2 font-mono font-bold uppercase tracking-widest border-b-2 border-black pb-1">
                // Data
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <NavLink to="/upload" className={navClass}>
                  <Upload size={16} strokeWidth={2.5} />
                  <span>Upload CSV</span>
                </NavLink>
              </div>
            </div>
          </>
        )}

        {role === 'student' && (
          <>
            <div>
              <p className="text-[10px] text-gray-500 mb-2 font-mono font-bold uppercase tracking-widest border-b-2 border-black pb-1">
                // Student Portal
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <NavLink to="/me/attendance" className={navClass}>
                  <UserCheck size={16} strokeWidth={2.5} />
                  <span>My Attendance</span>
                </NavLink>
                <NavLink to="/me/upcoming" className={navClass}>
                  <Calendar size={16} strokeWidth={2.5} />
                  <span>Upcoming</span>
                </NavLink>
                <NavLink to="/me/materials" className={navClass}>
                  <BookOpen size={16} strokeWidth={2.5} />
                  <span>Materials</span>
                </NavLink>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t-[3px] border-black bg-black flex flex-col gap-3">
        

        <div className="flex items-center justify-between mt-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white hover:text-[#FFE600] transition-colors font-mono text-xs uppercase tracking-widest font-bold"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          <button className="text-white hover:text-[#FFE600] transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
