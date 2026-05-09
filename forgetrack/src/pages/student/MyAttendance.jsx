import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, Calendar, TrendingUp, Clock, BarChart3, AlertTriangle } from 'lucide-react';

export default function MyAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [filterStatus, setFilterStatus] = useState('all'); // all, present, absent

  useEffect(() => {
    async function fetchMyAttendance() {
      try {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setLoading(false);
          return;
        }

        // Get user profile to find student_id
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('student_id, display_name, role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError || !userProfile) {
          setLoading(false);
          return;
        }

        // Get student details
        if (userProfile.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('*')
            .eq('id', userProfile.student_id)
            .maybeSingle();
          
          if (student) {
            setStudentInfo({ ...student, display_name: userProfile.display_name });
          }
        }

        // Fetch attendance records with session details
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            id,
            present,
            marked_at,
            session:sessions(id, date, topic, duration_hours, session_type, month_number)
          `)
          .order('marked_at', { ascending: false });

        if (!attendanceError && attendanceData) {
          setAttendance(attendanceData);
          
          const total = attendanceData.length;
          const present = attendanceData.filter(a => a.present).length;
          const absent = total - present;
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
          
          setStats({ total, present, absent, percentage });
        }
      } catch (err) {
        console.error('Error loading attendance:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMyAttendance();
  }, []);

  const filteredAttendance = attendance.filter(a => {
    if (filterStatus === 'present') return a.present;
    if (filterStatus === 'absent') return !a.present;
    return true;
  });

  const getStatusColor = (percentage) => {
    if (percentage >= 85) return { bg: '#CCFFDD', fg: '#00AA33', label: 'Excellent' };
    if (percentage >= 75) return { bg: '#FFF3CC', fg: '#CC8800', label: 'Good' };
    return { bg: '#FFDDDD', fg: '#CC0000', label: 'At Risk' };
  };

  const statusColor = getStatusColor(stats.percentage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-black border-t-[#FF3B00] animate-spin mx-auto mb-4" />
          <p className="font-mono font-bold text-sm uppercase tracking-widest text-gray-500">Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-black uppercase tracking-tight mb-2 font-mono">
          My Attendance
        </h1>
        <p className="text-gray-500 font-mono text-sm font-bold uppercase tracking-widest">
          {studentInfo ? `${studentInfo.name} • ${studentInfo.usn} • ${studentInfo.branch_code}` : 'Track your session attendance'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Attendance Percentage */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#FFE600] border-l-[3px] border-b-[3px] border-black -translate-y-1/2 translate-x-1/2 rotate-45" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FFE600] border-[2px] border-black flex items-center justify-center">
              <TrendingUp size={18} strokeWidth={2.5} className="text-black" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Rate</p>
          </div>
          <p className="text-4xl font-black text-black font-mono">{stats.percentage}%</p>
          <div className="mt-2">
            <span 
              className="px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wide border-[2px] border-black"
              style={{ backgroundColor: statusColor.bg, color: statusColor.fg }}
            >
              {statusColor.label}
            </span>
          </div>
        </div>

        {/* Total Sessions */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-black flex items-center justify-center">
              <Calendar size={18} strokeWidth={2.5} className="text-white" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Total</p>
          </div>
          <p className="text-4xl font-black text-black font-mono">{stats.total}</p>
          <p className="text-xs font-mono font-bold text-gray-400 mt-1 uppercase">Sessions Held</p>
        </div>

        {/* Present Count */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#CCFFDD] border-[2px] border-black flex items-center justify-center">
              <CheckCircle size={18} strokeWidth={2.5} className="text-[#00AA33]" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Present</p>
          </div>
          <p className="text-4xl font-black text-[#00AA33] font-mono">{stats.present}</p>
          <p className="text-xs font-mono font-bold text-gray-400 mt-1 uppercase">Days Attended</p>
        </div>

        {/* Absent Count */}
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#FFDDDD] border-[2px] border-black flex items-center justify-center">
              <XCircle size={18} strokeWidth={2.5} className="text-[#CC0000]" />
            </div>
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Absent</p>
          </div>
          <p className="text-4xl font-black text-[#CC0000] font-mono">{stats.absent}</p>
          <p className="text-xs font-mono font-bold text-gray-400 mt-1 uppercase">Days Missed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_#000] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-black uppercase tracking-widest font-mono">// Attendance Progress</h2>
          <span className="text-sm font-black font-mono text-black">{stats.present}/{stats.total}</span>
        </div>
        <div className="w-full bg-[#F5F0E8] border-[2px] border-black h-6 relative">
          <div 
            className="h-full bg-black relative transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          >
            {stats.percentage >= 10 && (
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#FF3B00]" />
            )}
          </div>
          {/* 75% threshold marker */}
          <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-[#FF3B00] z-10" />
          <div className="absolute -bottom-5 left-[75%] -translate-x-1/2">
            <span className="text-[9px] font-mono font-bold text-[#FF3B00] uppercase">75%</span>
          </div>
        </div>
        {stats.percentage < 75 && (
          <div className="mt-6 flex items-center gap-2 bg-[#FFDDDD] border-[2px] border-black px-4 py-3">
            <AlertTriangle size={16} strokeWidth={2.5} className="text-[#CC0000]" />
            <p className="text-xs font-mono font-bold text-[#CC0000] uppercase tracking-wide">
              Warning: Below 75% attendance threshold. You need {Math.ceil((0.75 * stats.total - stats.present) / (1 - 0.75))} more sessions to reach 75%.
            </p>
          </div>
        )}
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white border-[3px] border-black shadow-[5px_5px_0_#000] overflow-hidden">
        <div className="px-6 py-4 border-b-[3px] border-black flex items-center justify-between bg-black">
          <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono">// Session Records</h2>
          <div className="flex gap-0 border-[2px] border-white">
            {['all', 'present', 'absent'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest font-mono transition-colors border-r-[2px] border-r-white last:border-r-0 ${
                  filterStatus === status
                    ? 'bg-[#FFE600] text-black'
                    : 'bg-transparent text-white hover:bg-white/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="bg-[#FFE600]">
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Date</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Session Topic</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Type</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black border-r-[2px] border-r-black">Duration</th>
                <th className="py-3 px-5 font-mono font-black text-[10px] text-black uppercase tracking-widest border-b-[3px] border-black">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-mono text-sm font-bold uppercase tracking-widest">
                      {attendance.length === 0 ? 'No attendance records yet' : 'No records match filter'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record, i) => {
                  const session = record.session;
                  const dateStr = session?.date
                    ? new Date(session.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'N/A';

                  return (
                    <tr key={record.id} className="border-b-[2px] border-black hover:bg-[#F5F0E8] transition-colors animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="py-3.5 px-5 border-r-[2px] border-black">
                        <div className="flex items-center gap-2">
                          <Clock size={14} strokeWidth={2.5} className="text-gray-500" />
                          <span className="text-sm font-bold font-mono text-black">{dateStr}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 border-r-[2px] border-black">
                        <p className="text-sm font-bold text-black">{session?.topic || 'Unknown'}</p>
                        {session?.month_number && (
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">Month {session.month_number}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 border-r-[2px] border-black">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-wide bg-[#F5F0E8] border-[2px] border-black">
                          {session?.session_type || 'offline'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 border-r-[2px] border-black">
                        <span className="text-sm font-bold font-mono text-black">{session?.duration_hours || 2}h</span>
                      </td>
                      <td className="py-3.5 px-5">
                        {record.present ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#CCFFDD] text-[#00AA33] border-[2px] border-black text-[10px] font-black font-mono uppercase tracking-wide">
                            <CheckCircle size={12} strokeWidth={3} />
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFDDDD] text-[#CC0000] border-[2px] border-black text-[10px] font-black font-mono uppercase tracking-wide">
                            <XCircle size={12} strokeWidth={3} />
                            Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
