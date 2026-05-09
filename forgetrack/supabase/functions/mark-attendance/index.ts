// Supabase Edge Function: mark-attendance
// Validates and processes attendance marking from mentors
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AttendanceEntry {
  student_id: number
  present: boolean
}

interface MarkAttendancePayload {
  session_id: number
  entries: AttendanceEntry[]
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // User client for auth verification
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check that the user is a mentor
    const { data: userProfile, error: profileError } = await supabaseUser
      .from('users')
      .select('role, display_name')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'mentor') {
      return new Response(
        JSON.stringify({ error: 'Only mentors can mark attendance' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    const body: MarkAttendancePayload = await req.json()

    if (!body.session_id || !Number.isInteger(body.session_id)) {
      return new Response(
        JSON.stringify({ error: 'Valid session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(body.entries) || body.entries.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one attendance entry is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate each entry
    for (const entry of body.entries) {
      if (!entry.student_id || typeof entry.present !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'Each entry must have a valid student_id and boolean present field' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, date, topic')
      .eq('id', body.session_id)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check session date is not in the future
    const sessionDate = new Date(session.date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (sessionDate > today) {
      return new Response(
        JSON.stringify({ error: 'Cannot mark attendance for a future session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify all student IDs exist
    const studentIds = body.entries.map(e => e.student_id)
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id')
      .in('id', studentIds)

    if (studentsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify students', details: studentsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validStudentIds = new Set(students?.map(s => s.id) || [])
    const invalidIds = studentIds.filter(id => !validStudentIds.has(id))
    
    if (invalidIds.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Some student IDs are invalid', invalid_ids: invalidIds }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare upsert payload
    const payload = body.entries.map(entry => ({
      student_id: entry.student_id,
      session_id: body.session_id,
      present: entry.present,
      marked_by: userProfile.display_name || user.email,
      marked_at: new Date().toISOString(),
    }))

    // Upsert attendance records
    const { data: upsertedData, error: upsertError } = await supabaseAdmin
      .from('attendance')
      .upsert(payload, { onConflict: 'student_id,session_id' })
      .select()

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to save attendance', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build response summary
    const presentCount = body.entries.filter(e => e.present).length
    const absentCount = body.entries.length - presentCount

    return new Response(
      JSON.stringify({
        success: true,
        message: `Attendance marked for ${body.entries.length} students`,
        summary: {
          session_id: body.session_id,
          session_topic: session.topic,
          session_date: session.date,
          total_marked: body.entries.length,
          present: presentCount,
          absent: absentCount,
          marked_by: userProfile.display_name || user.email,
          marked_at: new Date().toISOString(),
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
