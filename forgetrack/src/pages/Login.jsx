import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NeoButton from '../components/NeoButton';

export default function Login() {
  const [tab, setTab] = useState('mentor');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const email = tab === 'mentor' ? identifier : `${identifier}@forge.local`;

      // Enforce real Supabase Auth to establish the session for RLS
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      if (userError) throw userError;
      if (!userData) throw new Error('User profile not found');

      localStorage.setItem('role', userData.role);
      navigate(userData.role === 'mentor' ? '/dashboard' : '/me/attendance');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6 font-display">
      {/* Decorative grid lines */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(#00000008 1px, transparent 1px), linear-gradient(90deg, #00000008 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="w-full max-w-[460px] z-10 animate-fade-in">
        {/* Header bar */}
        <div className="bg-[#FF3B00] border-[3px] border-black px-6 py-4 shadow-[6px_6px_0_#000] mb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black flex items-center justify-center font-black text-white text-xl">
              F
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              ForgeTrack
            </h1>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white border-[3px] border-black border-t-0 shadow-[6px_6px_0_#000] p-8">
          
          <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-6 border-l-4 border-black pl-3">
            // Authenticate to continue
          </p>

          {/* Tab Selector */}
          <div className="flex mb-7 border-[3px] border-black">
            <button
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all duration-100 ${
                tab === 'mentor'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[#FFE600]'
              }`}
              onClick={() => setTab('mentor')}
              type="button"
            >
              Mentor
            </button>
            <button
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest border-l-[3px] border-black transition-all duration-100 ${
                tab === 'student'
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-[#FFE600]'
              }`}
              onClick={() => setTab('student')}
              type="button"
            >
              Student
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-black text-black mb-2 uppercase tracking-widest">
                {tab === 'mentor' ? '→ Email Address' : '→ USN'}
              </label>
              <input
                type={tab === 'mentor' ? 'email' : 'text'}
                className="w-full bg-white border-[3px] border-black px-4 py-3 font-mono font-bold text-black placeholder-gray-400 focus:outline-none focus:shadow-[3px_3px_0_#000] focus:bg-[#FFFDF7] transition-all"
                placeholder={tab === 'mentor' ? 'tharun@forge.local' : '4SH24CS001'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-black mb-2 uppercase tracking-widest">
                → Password
              </label>
              <input
                type="password"
                className="w-full bg-white border-[3px] border-black px-4 py-3 font-mono font-bold text-black placeholder-gray-400 focus:outline-none focus:shadow-[3px_3px_0_#000] focus:bg-[#FFFDF7] transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-[#FFDDDD] border-[3px] border-black px-4 py-3 font-mono text-sm font-bold text-[#CC0000] shadow-[3px_3px_0_#000]">
                ✕ {error}
              </div>
            )}

            <NeoButton type="submit" className="w-full text-sm mt-2">
              Enter the Forge →
            </NeoButton>
          </form>

          <div className="mt-7 pt-5 border-t-[3px] border-black text-center font-mono text-xs text-gray-500 uppercase tracking-widest">
            Protected by ForgeTrack Auth
          </div>
        </div>

        {/* Bottom accent strip */}
        <div className="h-3 bg-[#FFE600] border-[3px] border-t-0 border-black shadow-[6px_3px_0_#000]" />
      </div>
    </div>
  );
}
