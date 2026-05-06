import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Please provide VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const students = [
  { name: 'Aarav Patel', usn: '4SH24CS001', branch_code: 'CS' },
  { name: 'Vivaan Sharma', usn: '4SH24CS002', branch_code: 'CS' },
  { name: 'Aditya Kumar', usn: '4SH24CS003', branch_code: 'AI' },
  { name: 'Vihaan Singh', usn: '4SH24CS004', branch_code: 'IS' },
  { name: 'Arjun Gupta', usn: '4SH24CS005', branch_code: 'CS' },
  { name: 'Sai Reddy', usn: '4SH24CS006', branch_code: 'AI' },
  { name: 'Ananya Joshi', usn: '4SH24CS007', branch_code: 'CS' },
  { name: 'Diya Nair', usn: '4SH24CS008', branch_code: 'IS' },
  { name: 'Isha Desai', usn: '4SH24CS009', branch_code: 'AI' },
  { name: 'Aadya Mehta', usn: '4SH24CS010', branch_code: 'CS' },
  { name: 'Nisha Rao', usn: '4SH24CS011', branch_code: 'CS' },
  { name: 'Rohan Kapoor', usn: '4SH24CS012', branch_code: 'AI' },
  { name: 'Kabir Verma', usn: '4SH24CS013', branch_code: 'IS' },
  { name: 'Shaurya Bhat', usn: '4SH24CS014', branch_code: 'CS' },
  { name: 'Riya Menon', usn: '4SH24CS015', branch_code: 'AI' },
  { name: 'Meera Iyer', usn: '4SH24CS016', branch_code: 'CS' },
  { name: 'Krish Pillai', usn: '4SH24CS017', branch_code: 'IS' },
  { name: 'Aryan Choudhury', usn: '4SH24CS018', branch_code: 'AI' },
  { name: 'Neha Jain', usn: '4SH24CS019', branch_code: 'CS' },
  { name: 'Kavya Das', usn: '4SH24CS020', branch_code: 'IS' },
  { name: 'Ishaan Thakur', usn: '4SH24CS021', branch_code: 'CS' },
  { name: 'Dhruv Saini', usn: '4SH24CS022', branch_code: 'AI' },
  { name: 'Sanya Agarwal', usn: '4SH24CS023', branch_code: 'IS' },
  { name: 'Kiara Arora', usn: '4SH24CS024', branch_code: 'CS' },
  { name: 'Priya Chatterjee', usn: '4SH24CS025', branch_code: 'AI' }
];

const sessions = [
  { date: '2025-08-05', topic: '8-Layer AI Stack', month_number: 4, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-08-12', topic: 'ReAct Agent Pattern', month_number: 4, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-08-19', topic: 'Vector Embeddings', month_number: 4, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-08-26', topic: 'pgvector RAG', month_number: 4, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-09-02', topic: 'Tiered Autonomy Multi-Agent', month_number: 4, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-09-09', topic: 'LLM Function Calling', month_number: 5, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-09-16', topic: 'Fine-tuning Foundations', month_number: 5, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-09-23', topic: 'LoRA and QLoRA', month_number: 5, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-09-30', topic: 'Evaluation Metrics for AI', month_number: 5, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-10-07', topic: 'Deploying on Edge', month_number: 5, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-10-14', topic: 'ONNX Runtime', month_number: 6, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-10-21', topic: 'Vision Models Introduction', month_number: 6, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-10-28', topic: 'Multimodal Agents', month_number: 6, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-11-04', topic: 'Reinforcement Learning Basics', month_number: 6, duration_hours: 2.0, session_type: 'offline' },
  { date: '2025-11-11', topic: 'Future of AI Architecture', month_number: 6, duration_hours: 2.0, session_type: 'offline' }
];

const mentors = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'nischay@theboringpeople.in', display_name: 'Nischay B K' },
  { id: '00000000-0000-0000-0000-000000000002', email: 'varun@theboringpeople.in', display_name: 'Varun' },
  { id: '00000000-0000-0000-0000-000000000003', email: 'tharun@forge.local', display_name: 'Tharun Rai' }
];

async function seed() {
  console.log('Starting seed process...');

  // 1. Create Mentors in Auth
  console.log('\nCreating/Checking Mentors...');
  for (const mentor of mentors) {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        id: mentor.id,
        email: mentor.email,
        password: 'admin',
        email_confirm: true
      });

      if (authError && !authError.message.includes('already exists')) {
        console.error(`Error creating auth user for ${mentor.email}:`, authError.message);
      } else {
        console.log(`✓ Auth user created/verified for ${mentor.email}`);
      }
    } catch (e) {
      console.log(`✓ Auth user already exists for ${mentor.email}`);
    }

    // Insert into public.users
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: mentor.id,
        email: mentor.email,
        role: 'mentor',
        display_name: mentor.display_name
      }, { onConflict: 'id' });

    if (userError) {
      console.error(`Error inserting public profile for ${mentor.email}:`, userError.message);
    } else {
      console.log(`✓ Public profile populated for ${mentor.display_name}`);
    }
  }

  // 2. Insert Students
  console.log('\nPopulating Students...');
  const { error: studentError } = await supabase
    .from('students')
    .upsert(students, { onConflict: 'usn' });

  if (studentError) {
    console.error('Error seeding students:', studentError.message);
  } else {
    console.log(`✓ Seeded ${students.length} students successfully.`);
  }

  // 3. Insert Sessions
  console.log('\nPopulating Sessions...');
  const { error: sessionError } = await supabase
    .from('sessions')
    .upsert(sessions, { onConflict: 'date' });

  if (sessionError) {
    console.error('Error seeding sessions:', sessionError.message);
  } else {
    console.log(`✓ Seeded ${sessions.length} sessions successfully.`);
  }

  console.log('\nSeeding completed successfully!');
}

seed();
