// Follow this Supabase Edge Functions setup pattern
// For local development: supabase functions serve
// For deployment: supabase functions deploy <function-name>
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile to find student_id
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('student_id, role, display_name')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body for optional student_id (mentors can query any student)
    let targetStudentId = userProfile.student_id
    if (req.method === 'POST') {
      const body = await req.json()
      if (body.student_id && userProfile.role === 'mentor') {
        targetStudentId = body.student_id
      }
    }

    if (!targetStudentId) {
      return new Response(
        JSON.stringify({ error: 'No student ID associated with this account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch attendance records for the student
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        id,
        present,
        marked_at,
        session:sessions(id, date, topic, duration_hours, session_type, month_number)
      `)
      .eq('student_id', targetStudentId)
      .order('marked_at', { ascending: false })

    if (attendanceError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch attendance data', details: attendanceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch student info
    const { data: studentInfo } = await supabase
      .from('students')
      .select('id, name, usn, branch_code, batch')
      .eq('id', targetStudentId)
      .single()

    // Calculate summary statistics
    const totalSessions = attendanceRecords?.length || 0
    const presentCount = attendanceRecords?.filter(a => a.present).length || 0
    const absentCount = totalSessions - presentCount
    const attendancePercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0

    // Calculate monthly breakdown
    const monthlyBreakdown = {}
    attendanceRecords?.forEach(record => {
      const month = record.session?.month_number || 0
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { total: 0, present: 0 }
      }
      monthlyBreakdown[month].total++
      if (record.present) monthlyBreakdown[month].present++
    })

    // Calculate streak (consecutive present days)
    let currentStreak = 0
    let maxStreak = 0
    const sortedRecords = [...(attendanceRecords || [])].sort((a, b) => 
      new Date(a.session?.date || 0) - new Date(b.session?.date || 0)
    )
    
    for (const record of sortedRecords) {
      if (record.present) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }

    // Determine attendance status
    let status = 'excellent'
    if (attendancePercentage < 75) status = 'at_risk'
    else if (attendancePercentage < 85) status = 'good'

    const summary = {
      student: studentInfo || null,
      statistics: {
        total_sessions: totalSessions,
        present: presentCount,
        absent: absentCount,
        attendance_percentage: attendancePercentage,
        status: status,
        current_streak: currentStreak,
        max_streak: maxStreak,
      },
      monthly_breakdown: monthlyBreakdown,
      records: attendanceRecords || [],
    }

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
