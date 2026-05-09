import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, BookOpen, Activity, Clock, MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Mon', current: 4000, previous: 2400 },
  { name: 'Tue', current: 3000, previous: 1398 },
  { name: 'Wed', current: 2000, previous: 9800 },
  { name: 'Thu', current: 2780, previous: 3908 },
  { name: 'Fri', current: 1890, previous: 4800 },
  { name: 'Sat', current: 2390, previous: 3800 },
  { name: 'Sun', current: 3490, previous: 4300 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border-[2px] border-black px-3 py-2 shadow-[3px_3px_0_#FF3B00]">
        <p className="font-mono text-[10px] text-[#FFE600] uppercase font-bold mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-mono text-xs text-white font-bold">{p.name}: <span style={{ color: p.color }}>{p.value}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [avgAttendance, setAvgAttendance] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [phaseProgress, setPhaseProgress] = useState([]);
  const [sessionChartData, setSessionChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. Fetch sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .order('date', { ascending: true });
        
        const fetchedSessions = sessionsData || [];
        setSessions(fetchedSessions);
        setActiveDays(fetchedSessions.length);

        // 2. Fetch student count
        const { count: stuCount, error: stuError } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
        setStudentCount(stuCount || 0);

        // 3. Fetch attendance stats
        const { data: attData, error: attError } = await supabase
          .from('attendance')
          .select('present');
        
        if (attData && attData.length > 0) {
          const presentCount = attData.filter(a => a.present).length;
          setAvgAttendance(Math.round((presentCount / attData.length) * 100));
        } else {
          setAvgAttendance(0);
        }

        // 4. Fetch recent attendance joined with student and session info
        const { data: recentAtt, error: recentAttError } = await supabase
          .from('attendance')
          .select(`
            id,
            present,
            marked_at,
            student:students(name, email, usn),
            session:sessions(topic, date, session_type)
          `)
          .order('marked_at', { ascending: false })
          .limit(5);
        setRecentAttendance(recentAtt || []);

        // 5. Calculate phase progress dynamically based on sessions in each month
        const sessionsByMonth = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
        fetchedSessions.forEach(s => {
          if (sessionsByMonth[s.month_number] !== undefined) {
            sessionsByMonth[s.month_number]++;
          }
        });
        const computedPhaseProgress = [
          { label: 'Phase 1: Onboarding', pct: Math.min(100, Math.round((sessionsByMonth[4] / 5) * 100)) },
          { label: 'Phase 2: Core Skills', pct: Math.min(100, Math.round((sessionsByMonth[5] / 5) * 100)) },
          { label: 'Phase 3: Advanced', pct: Math.min(100, Math.round((sessionsByMonth[6] / 5) * 100)) },
          { label: 'Phase 4: Capstone', pct: Math.min(100, Math.round((sessionsByMonth[7] / 3) * 100)) },
          { label: 'Phase 5: Graduation', pct: Math.min(100, Math.round((sessionsByMonth[8] / 2) * 100)) },
        ];
        setPhaseProgress(computedPhaseProgress);

        // 6. Fetch interactive chart data: attendance rate per session
        const { data: sessionsWithAtt, error: chartError } = await supabase
          .from('sessions')
          .select(`
            id,
            date,
            topic,
            attendance(present)
          `)
          .order('date', { ascending: true });

        const computedChartData = (sessionsWithAtt || []).map(session => {
          const atts = session.attendance || [];
          const total = atts.length;
          const present = atts.filter(a => a.present).length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;
          return {
            name: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            current: rate,
            previous: Math.max(0, rate - 10), // Comparison line
            topic: session.topic
          };
        }).slice(-7);

        if (computedChartData.length > 0) {
          setSessionChartData(computedChartData);
        } else {
          setSessionChartData([
            { name: 'Mon', current: 0, previous: 0 },
            { name: 'Tue', current: 0, previous: 0 },
            { name: 'Wed', current: 0, previous: 0 },
            { name: 'Thu', current: 0, previous: 0 },
            { name: 'Fri', current: 0, previous: 0 }
          ]);
        }

      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const totalSessions = sessions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-black font-mono font-bold uppercase tracking-widest text-sm">
        <span className="animate-pulse">// Loading...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Accent card - red */}
        <div className="bg-[#FF3B00] border-[3px] border-black p-5 shadow-[5px_5px_0_#000] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-mono font-bold text-[10px] uppercase tracking-widest">Total Sessions</span>
            <BookOpen size={18} className="text-white/70" strokeWidth={2.5} />
          </div>
          <h3 className="text-5xl font-black text-white tracking-tighter leading-none">{totalSessions}</h3>
          <div className="flex items-center gap-1.5 mt-3 bg-black/20 inline-flex px-2 py-1">
            <ArrowUpRight size={13} className="text-[#FFE600]" />
            <span className="text-[#FFE600] font-mono text-xs font-bold">+12.5%</span>
          </div>
          <p className="text-white/60 text-[10px] font-mono mt-2 uppercase tracking-widest">vs last month</p>
        </div>

        {/* Enrolled Students */}
        <div className="bg-white border-[3px] border-black p-5 shadow-[5px_5px_0_#000] hover:shadow-[7px_7px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-mono font-bold text-[10px] uppercase tracking-widest">Enrolled Students</span>
            <Users size={18} className="text-black" strokeWidth={2.5} />
          </div>
          <h3 className="text-5xl font-black text-black tracking-tighter leading-none">{studentCount}</h3>
          <div className="flex items-center gap-1.5 mt-3 bg-[#CCFFDD] border-[2px] border-black inline-flex px-2 py-1">
            <ArrowUpRight size={13} className="text-[#00AA33]" />
            <span className="text-[#00AA33] font-mono text-xs font-bold">+4.2%</span>
          </div>
          <p className="text-gray-400 text-[10px] font-mono mt-2 uppercase tracking-widest">Active this semester</p>
        </div>

        {/* Avg Attendance */}
        <div className="bg-[#FFE600] border-[3px] border-black p-5 shadow-[5px_5px_0_#000] hover:shadow-[7px_7px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-black font-mono font-bold text-[10px] uppercase tracking-widest">Avg. Attendance</span>
            <Activity size={18} className="text-black" strokeWidth={2.5} />
          </div>
          <h3 className="text-5xl font-black text-black tracking-tighter leading-none">{avgAttendance}%</h3>
          <div className="flex items-center gap-1.5 mt-3 bg-[#FFDDDD] border-[2px] border-black inline-flex px-2 py-1">
            <ArrowDownRight size={13} className="text-[#CC0000]" />
            <span className="text-[#CC0000] font-mono text-xs font-bold">-1.1%</span>
          </div>
          <p className="text-black/60 text-[10px] font-mono mt-2 uppercase tracking-widest">Across all phases</p>
        </div>

        {/* Active Days */}
        <div className="bg-white border-[3px] border-black p-5 shadow-[5px_5px_0_#000] hover:shadow-[7px_7px_0_#000] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 font-mono font-bold text-[10px] uppercase tracking-widest">Active Days</span>
            <Calendar size={18} className="text-black" strokeWidth={2.5} />
          </div>
          <h3 className="text-5xl font-black text-black tracking-tighter leading-none">{activeDays}</h3>
          <div className="flex items-center gap-1.5 mt-3 bg-[#CCFFDD] border-[2px] border-black inline-flex px-2 py-1">
            <ArrowUpRight size={13} className="text-[#00AA33]" />
            <span className="text-[#00AA33] font-mono text-xs font-bold">+8.4%</span>
          </div>
          <p className="text-gray-400 text-[10px] font-mono mt-2 uppercase tracking-widest">Days with activity</p>
        </div>
      </div>

      {/* Chart + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Chart */}
        <div className="bg-white border-[3px] border-black shadow-[5px_5px_0_#000] lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-black">
            <h2 className="text-sm font-black text-black uppercase tracking-widest font-mono">// Session Attendance Rate (%)</h2>
            <select className="bg-white border-[2px] border-black text-black text-xs font-mono font-bold px-3 py-1.5 uppercase tracking-wide focus:outline-none focus:shadow-[2px_2px_0_#000] cursor-pointer">
              <option>By Session</option>
            </select>
          </div>
          <div className="p-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3B00" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF3B00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000015" vertical={false} />
                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} axisLine={false} fontFamily="Space Mono" />
                <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} fontFamily="Space Mono" unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="previous" stroke="#00000030" strokeWidth={2} fill="transparent" strokeDasharray="4 4" name="Baseline" />
                <Area type="monotone" dataKey="current" stroke="#FF3B00" strokeWidth={3} fillOpacity={1} fill="url(#colorCurrent)" name="Attendance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress bars */}
        <div className="bg-white border-[3px] border-black shadow-[5px_5px_0_#000]">
          <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-black">
            <h2 className="text-sm font-black text-black uppercase tracking-widest font-mono">// Phase Progress</h2>
            <button className="text-black hover:text-[#FF3B00] transition-colors">
              <MoreHorizontal size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="p-6 space-y-5">
            {phaseProgress.map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-mono font-bold text-black uppercase tracking-wide">{label}</span>
                  <span className="font-black text-black font-mono">{pct}%</span>
                </div>
                <div className="w-full bg-[#F5F0E8] border-[2px] border-black h-3">
                  <div className="bg-black h-full relative" style={{ width: `${pct}%` }}>
                    {pct >= 20 && (
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#FF3B00]" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border-[3px] border-black shadow-[5px_5px_0_#000] overflow-hidden">
        <div className="px-6 py-4 border-b-[3px] border-black flex items-center justify-between bg-black">
          <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono">// Recent Attendance Marks</h2>
          <button className="text-[#FFE600] hover:text-white transition-colors font-mono text-xs font-bold uppercase tracking-widest border-b border-[#FFE600] hover:border-white">View All →</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[#FFE600]">
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Student</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Session Topic</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Date</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Status</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black text-right">Act.</th>
              </tr>
            </thead>
            <tbody>
              {(recentAttendance.length > 0 ? recentAttendance : [1, 2, 3]).map((att, i) => {
                const isReal = typeof att === 'object' && att.id;
                const studentName = isReal && att.student ? att.student.name : `Student ${i + 1}`;
                const studentEmail = isReal && att.student ? att.student.email : `student${i + 1}@forge.local`;
                const sessionTopic = isReal && att.session ? att.session.topic : 'General Check-in';
                const sessionType = isReal && att.session ? att.session.session_type : 'offline';
                const dateStr = isReal && att.session && att.session.date
                  ? new Date(att.session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : `Oct ${10 + i}, 2023`;
                const isPresent = isReal ? att.present : (i % 3 !== 2);

                return (
                  <tr key={isReal ? att.id : i} className="border-b-[2px] border-black hover:bg-[#F5F0E8] transition-colors">
                    <td className="py-3.5 px-5 border-r-[2px] border-black">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-[2px] border-black bg-[#FFE600] flex items-center justify-center text-xs font-black text-black overflow-hidden">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=FFE600&color=000000&bold=true`} alt="s" />
                        </div>
                        <div>
                          <p className="text-black text-sm font-black font-mono">{studentName}</p>
                          <p className="text-gray-400 text-[10px] font-mono">{studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 border-r-[2px] border-black">
                      <p className="text-black text-sm font-bold">{sessionTopic}</p>
                      <p className="text-gray-400 text-[10px] font-mono">{sessionType}</p>
                    </td>
                    <td className="py-3.5 px-5 border-r-[2px] border-black">
                      <div className="flex items-center gap-1.5 text-black text-sm font-mono font-bold">
                        <Clock size={13} strokeWidth={2.5} />
                        {dateStr}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 border-r-[2px] border-black">
                      {isPresent
                        ? <span className="px-2.5 py-1 bg-[#CCFFDD] text-[#00AA33] border-[2px] border-black text-[10px] font-black font-mono uppercase tracking-wide">Present</span>
                        : <span className="px-2.5 py-1 bg-[#FFDDDD] text-[#CC0000] border-[2px] border-black text-[10px] font-black font-mono uppercase tracking-wide">Absent</span>
                      }
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button className="text-black hover:text-[#FF3B00] transition-colors">
                        <MoreHorizontal size={17} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
