/**
 * Backfill embeddings for existing contracts.
 *
 * Reads raw_text (or re-parses from storage) for each contract,
 * chunks the text, generates OpenAI embeddings, and inserts
 * into contract_chunks.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * Requires OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, and
 * SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks.filter((c) => c.trim().length > 50);
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8000)),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`OpenAI error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

async function main() {
  console.log('Fetching contracts...');

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, title, summary, raw_text')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch contracts:', error.message);
    process.exit(1);
  }

  console.log(`Found ${contracts.length} contracts\n`);

  let processed = 0;
  let skipped = 0;

  for (const contract of contracts) {
    // Check if already has chunks
    const { count } = await supabase
      .from('contract_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contract.id);

    if (count && count > 0) {
      console.log(`  [skip] "${contract.title}" — already has ${count} chunks`);
      skipped++;
      continue;
    }

    // Use raw_text if available, otherwise fall back to summary
    const text = contract.raw_text || contract.summary;
    if (!text || text.trim().length < 50) {
      console.log(`  [skip] "${contract.title}" — no text content`);
      skipped++;
      continue;
    }

    console.log(`  [processing] "${contract.title}" (${text.length} chars)...`);

    // Store raw_text if not already set
    if (!contract.raw_text && contract.summary) {
      await supabase
        .from('contracts')
        .update({ raw_text: contract.summary })
        .eq('id', contract.id);
    }

    // Chunk and embed
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      console.log(`    No viable chunks`);
      skipped++;
      continue;
    }

    try {
      // Batch embeddings (OpenAI supports up to ~2048 inputs)
      const batchSize = 50;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await generateEmbeddings(batch);

        const rows = batch.map((content, j) => ({
          contract_id: contract.id,
          chunk_index: i + j,
          content,
          embedding: JSON.stringify(embeddings[j]),
        }));

        const { error: insertError } = await supabase
          .from('contract_chunks')
          .insert(rows);

        if (insertError) {
          console.error(`    Insert failed: ${insertError.message}`);
          break;
        }
      }

      console.log(`    ✓ ${chunks.length} chunks embedded`);
      processed++;
    } catch (err) {
      console.error(`    Embedding failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone: ${processed} processed, ${skipped} skipped`);
}

main();
