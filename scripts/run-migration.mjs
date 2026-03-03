import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  username: 'postgres.dyxpsbbjwpfeizfttzum',
  password: process.env.DATABASE_PASSWORD,
  ssl: 'require',
});

async function runMigration(filePath) {
  const migrationSql = readFileSync(resolve(__dirname, '..', filePath), 'utf-8');
  console.log(`Running migration: ${filePath}`);
  try {
    await sql.unsafe(migrationSql);
    console.log(`  OK`);
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
  }
}

try {
  // Test connection
  const [{ ok }] = await sql`SELECT 1 as ok`;
  console.log(`Connected! (${ok})\n`);

  await runMigration('supabase/migrations/001_initial_schema.sql');
  await runMigration('supabase/migrations/002_storage_bucket.sql');
  console.log('\nAll migrations complete.');
} catch (err) {
  console.error('Connection failed:', err.message);
} finally {
  await sql.end();
}
