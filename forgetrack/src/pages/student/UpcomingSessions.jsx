import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, BookOpen, ChevronRight } from 'lucide-react';

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([]);
  const [pastSessions, setPastSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch upcoming sessions (date >= today)
        const { data: upcoming, error: upError } = await supabase
          .from('sessions')
          .select('*')
          .gte('date', today)
          .order('date', { ascending: true });

        if (!upError && upcoming) setSessions(upcoming);

        // Fetch recent past sessions (last 5)
        const { data: past, error: pastError } = await supabase
          .from('sessions')
          .select('*')
          .lt('date', today)
          .order('date', { ascending: false })
          .limit(5);

        if (!pastError && past) setPastSessions(past);
      } catch (err) {
        console.error('Error loading sessions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('en-US', { day: 'numeric' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessionDate = new Date(dateStr);
    sessionDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((sessionDate - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-black border-t-[#FF3B00] animate-spin mx-auto mb-4" />
          <p className="font-mono font-bold text-sm uppercase tracking-widest text-gray-500">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-2 font-mono">
          Upcoming Sessions
        </h1>
        <p className="text-gray-500 font-mono text-sm font-bold uppercase tracking-widest">
          Your scheduled training sessions
        </p>
      </div>

      {/* Upcoming Sessions */}
      {sessions.length === 0 ? (
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-12 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="font-mono font-bold text-sm uppercase tracking-widest text-gray-500 mb-2">No upcoming sessions</p>
          <p className="text-gray-400 text-sm">Check back later for new scheduled sessions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const date = formatDate(session.date);
            const daysUntil = getDaysUntil(session.date);
            const isToday = daysUntil === 'Today';
            const isTomorrow = daysUntil === 'Tomorrow';

            return (
              <div 
                key={session.id} 
                className={`bg-white border-[3px] border-black shadow-[4px_4px_0_#000] overflow-hidden animate-fade-in ${isToday ? 'shadow-[4px_4px_0_#FF3B00]' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex">
                  {/* Date Block */}
                  <div className={`w-24 flex-shrink-0 flex flex-col items-center justify-center border-r-[3px] border-black p-4 ${isToday ? 'bg-[#FF3B00] text-white' : 'bg-[#FFE600] text-black'}`}>
                    <span className="text-[10px] font-mono font-black uppercase tracking-widest">{date.month}</span>
                    <span className="text-3xl font-black font-mono leading-none mt-1">{date.day}</span>
                    <span className="text-[10px] font-mono font-bold uppercase mt-1 opacity-70">{date.weekday.substring(0, 3)}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-black uppercase tracking-tight">{session.topic}</h3>
                        {(isToday || isTomorrow) && (
                          <span className={`px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wide border-[2px] border-black ${isToday ? 'bg-[#FF3B00] text-white' : 'bg-[#FFE600] text-black'}`}>
                            {daysUntil}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-gray-500">
                          <Clock size={12} strokeWidth={2.5} />
                          {session.duration_hours || 2}h
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-gray-500">
                          <MapPin size={12} strokeWidth={2.5} />
                          {session.session_type || 'offline'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-gray-500">
                          <BookOpen size={12} strokeWidth={2.5} />
                          Month {session.month_number}
                        </span>
                        {!isToday && !isTomorrow && (
                          <span className="text-xs font-mono font-bold text-gray-400">{daysUntil}</span>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-xs text-gray-400 mt-2 font-mono">{session.notes}</p>
                      )}
                    </div>
                    <ChevronRight size={20} strokeWidth={2.5} className="text-gray-400 flex-shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Past Sessions */}
      {pastSessions.length > 0 && (
        <div className="bg-white border-[3px] border-black shadow-[5px_5px_0_#000] overflow-hidden">
          <div className="px-6 py-4 border-b-[3px] border-black bg-black">
            <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono">// Recent Sessions</h2>
          </div>
          <div className="divide-y-[2px] divide-black">
            {pastSessions.map(session => {
              const date = formatDate(session.date);
              return (
                <div key={session.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#F5F0E8] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F0E8] border-[2px] border-black flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-mono font-black uppercase">{date.month}</span>
                      <span className="text-sm font-black font-mono leading-none">{date.day}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-black">{session.topic}</p>
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{session.session_type} • {session.duration_hours || 2}h</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wide bg-[#F5F0E8] border-[2px] border-black text-gray-500">
                    Completed
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
