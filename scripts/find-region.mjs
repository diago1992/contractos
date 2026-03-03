import postgres from 'postgres';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = 'Dumaguete2026!';
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log(`Project ref: ${projectRef}`);
console.log(`Password length: ${dbPassword.length}`);

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'us-east-1', 'us-west-1',
  'eu-west-1', 'eu-central-1',
];

for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`\nTrying ${region} -> ${host}:6543`);
  const sql = postgres({
    host,
    port: 6543,
    database: 'postgres',
    username: `postgres.${projectRef}`,
    password: dbPassword,
    ssl: 'require',
    connect_timeout: 10,
  });

  try {
    await sql`SELECT 1 as ok`;
    console.log(`SUCCESS!`);
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    console.log(`  Code: ${err.code}`);
    await sql.end().catch(() => {});
  }
}

// Also try session mode (port 5432)
console.log('\n--- Trying session mode (port 5432) ---');
for (const region of ['ap-southeast-2', 'ap-southeast-1']) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`\nTrying ${region} -> ${host}:5432`);
  const sql = postgres({
    host,
    port: 5432,
    database: 'postgres',
    username: `postgres.${projectRef}`,
    password: dbPassword,
    ssl: 'require',
    connect_timeout: 10,
  });

  try {
    await sql`SELECT 1 as ok`;
    console.log(`SUCCESS!`);
    await sql.end();
    process.exit(0);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
    await sql.end().catch(() => {});
  }
}
