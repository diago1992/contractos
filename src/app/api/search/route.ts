import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isEmbeddingsConfigured, generateEmbedding } from '@/lib/embeddings';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    if (!isEmbeddingsConfigured()) {
      return NextResponse.json(
        { error: 'Semantic search is not configured. Set OPENAI_API_KEY to enable.' },
        { status: 503 }
      );
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Use admin client to call the match function (RPC bypasses column-level restrictions)
    const admin = createAdminClient();
    const { data: chunks, error: matchError } = await admin.rpc(
      'match_contract_chunks',
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: threshold,
        match_count: limit,
      }
    );

    if (matchError) {
      console.error('Semantic search error:', matchError);
      return NextResponse.json({ error: matchError.message }, { status: 500 });
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ results: [], contracts: [] });
    }

    // Get unique contract IDs from matching chunks
    const contractIds = [...new Set((chunks as { contract_id: string }[]).map((c) => c.contract_id))];

    // Fetch contract details
    const { data: contracts, error: contractsError } = await admin
      .from('contracts')
      .select('id, title, counterparty_name, document_type, status, expiry_date, file_name')
      .in('id', contractIds)
      .is('deleted_at', null);

    if (contractsError) {
      return NextResponse.json({ error: contractsError.message }, { status: 500 });
    }

    // Build response: group chunks by contract
    const contractMap = new Map(
      (contracts ?? []).map((c) => [c.id, c])
    );

    const results = (chunks as { id: string; contract_id: string; chunk_index: number; content: string; similarity: number }[]).map((chunk) => ({
      chunk_id: chunk.id,
      contract_id: chunk.contract_id,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      similarity: chunk.similarity,
      contract: contractMap.get(chunk.contract_id) ?? null,
    }));

    return NextResponse.json({
      results,
      contracts: contracts ?? [],
      query,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Search API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
