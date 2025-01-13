import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  try {
    // Check if companies table exists and its structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('companies')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('Error checking companies table:', tableError);
      return;
    }

    console.log('Companies table exists and is accessible');
    
    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_info', { table_name: 'companies' });

    if (columnsError) {
      console.error('Error getting table structure:', columnsError);
      return;
    }

    console.log('Table structure:', columns);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSchema();
