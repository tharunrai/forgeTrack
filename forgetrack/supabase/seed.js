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
        password: 'admin123',
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

  console.log('\nSeeding completed successfully!');
}

seed();
