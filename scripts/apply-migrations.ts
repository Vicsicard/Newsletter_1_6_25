import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://odjvatrrqyuspcjxlnki.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kanZhdHJycXl1c3BjanhsbmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTA2MTMwMiwiZXhwIjoyMDUwNjM3MzAyfQ.SmLRECO23Odm3d_sLH4Om9pQFkhmWOro5-1q07K0n70';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres'
});

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  // Get list of migration files
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Apply each migration
    for (const file of migrationFiles) {
      console.log(`Applying migration ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      try {
        await client.query(sql);
        console.log(`Migration ${file} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        await client.query('ROLLBACK');
        process.exit(1);
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('All migrations applied successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

main().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
