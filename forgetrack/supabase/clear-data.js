import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Please make sure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearData() {
  console.log('--- Starting Database Deletion (Preserving Auth) ---');

  // 1. Delete all attendance marks first (dependent on sessions & students)
  console.log('1. Clearing "attendance" records...');
  const { error: attError } = await supabase
    .from('attendance')
    .delete()
    .neq('marked_by', 'non_existent_value_to_delete_all');

  if (attError) {
    console.error('✕ Error clearing attendance:', attError.message);
  } else {
    console.log('✓ Successfully cleared public.attendance!');
  }

  // 2. Delete all curriculum sessions
  console.log('2. Clearing "sessions" records...');
  const { error: sessError } = await supabase
    .from('sessions')
    .delete()
    .neq('session_type', 'non_existent_value_to_delete_all');

  if (sessError) {
    console.error('✕ Error clearing sessions:', sessError.message);
  } else {
    console.log('✓ Successfully cleared public.sessions!');
  }

  // 3. Delete all student profiles
  console.log('3. Clearing "students" records...');
  const { error: stuError } = await supabase
    .from('students')
    .delete()
    .neq('branch_code', 'non_existent_value_to_delete_all');

  if (stuError) {
    console.error('✕ Error clearing students:', stuError.message);
  } else {
    console.log('✓ Successfully cleared public.students!');
  }

  console.log('\n--- Deletion Completed ---');
  console.log('All transient attendance, sessions, and students data have been purged.');
  console.log('Your Auth Users (logins) and Mentor Profiles remain intact!');
}

clearData();
