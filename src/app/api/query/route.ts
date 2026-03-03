import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isEmbeddingsConfigured, generateEmbedding } from '@/lib/embeddings';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question } = body as { question?: string };

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    let contractContext = '';
    let contractIds: string[] = [];

    if (isEmbeddingsConfigured()) {
      // --- Semantic retrieval via pgvector embeddings ---
      const queryEmbedding = await generateEmbedding(question);
      const { data: chunks, error: matchError } = await admin.rpc(
        'match_contract_chunks',
        {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: 0.6,
          match_count: 15,
        }
      );

      if (matchError) {
        console.error('Semantic search failed, falling back to text search:', matchError.message);
      } else if (chunks && chunks.length > 0) {
        contractIds = [...new Set(chunks.map((c) => c.contract_id))];

        const { data: contracts } = await admin
          .from('contracts')
          .select('id, title, counterparty_name, document_type, status, effective_date, expiry_date, summary')
          .in('id', contractIds)
          .is('deleted_at', null);

        const contractMap = new Map(
          (contracts ?? []).map((c) => [c.id, c])
        );

        const grouped = new Map<string, string[]>();
        for (const chunk of chunks) {
          if (!grouped.has(chunk.contract_id)) {
            grouped.set(chunk.contract_id, []);
          }
          grouped.get(chunk.contract_id)!.push(chunk.content);
        }

        const sections: string[] = [];
        for (const [cid, chunkTexts] of grouped) {
          const meta = contractMap.get(cid);
          const header = meta
            ? `Contract: "${meta.title}" | Counterparty: ${meta.counterparty_name ?? 'Unknown'} | Type: ${meta.document_type ?? 'Unknown'} | Status: ${meta.status} | Effective: ${meta.effective_date ?? 'N/A'} | Expiry: ${meta.expiry_date ?? 'N/A'}`
            : `Contract ID: ${cid}`;
          sections.push(`--- ${header} ---\n${chunkTexts.join('\n...\n')}`);
        }

        contractContext = sections.join('\n\n');
      }
    }

    // --- Fallback: metadata + summaries when no embeddings or no results ---
    if (!contractContext) {
      // Fetch contracts with their summaries and related data
      // Use ilike search on title/counterparty as a simple keyword match
      const keywords = question
        .replace(/[?.,!;:'"()]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 3);

      // Try keyword match on title/counterparty first
      let contracts: typeof textResults = [];
      const { data: textResults } = await admin
        .from('contracts')
        .select('id, title, counterparty_name, document_type, status, effective_date, expiry_date, summary')
        .is('deleted_at', null)
        .or(keywords.map((k) => `title.ilike.%${k}%,counterparty_name.ilike.%${k}%`).join(','))
        .limit(10);

      contracts = textResults ?? [];

      // If keyword match returned nothing, just fetch all contracts as context
      if (contracts.length === 0) {
        const { data: allContracts } = await admin
          .from('contracts')
          .select('id, title, counterparty_name, document_type, status, effective_date, expiry_date, summary')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(20);

        contracts = allContracts ?? [];
      }

      contractIds = contracts.map((c) => c.id);

      // Also fetch commercial terms and obligations for richer context
      let termsContext = '';
      let obligationsContext = '';
      if (contractIds.length > 0) {
        const [termsResult, obligationsResult] = await Promise.all([
          admin.from('commercial_terms').select('contract_id, term_type, description, amount, currency, frequency').in('contract_id', contractIds),
          admin.from('obligations').select('contract_id, title, description, due_date, status').in('contract_id', contractIds),
        ]);

        if (termsResult.data && termsResult.data.length > 0) {
          termsContext = '\n\n--- Commercial Terms ---\n' + termsResult.data.map((t) =>
            `[${contracts.find((c) => c.id === t.contract_id)?.title ?? t.contract_id}] ${t.term_type}: ${t.description}${t.amount ? ` ($${t.amount} ${t.currency ?? 'AUD'}${t.frequency ? ' ' + t.frequency : ''})` : ''}`
          ).join('\n');
        }

        if (obligationsResult.data && obligationsResult.data.length > 0) {
          obligationsContext = '\n\n--- Obligations ---\n' + obligationsResult.data.map((o) =>
            `[${contracts.find((c) => c.id === o.contract_id)?.title ?? o.contract_id}] ${o.title}: ${o.description ?? ''}${o.due_date ? ` (due: ${o.due_date})` : ''} [${o.status}]`
          ).join('\n');
        }
      }

      const sections: string[] = contracts.map((c) => {
        const header = `Contract: "${c.title}" | Counterparty: ${c.counterparty_name ?? 'Unknown'} | Type: ${c.document_type ?? 'Unknown'} | Status: ${c.status} | Effective: ${c.effective_date ?? 'N/A'} | Expiry: ${c.expiry_date ?? 'N/A'}`;
        const body = c.summary ?? '(no summary available)';
        return `--- ${header} ---\n${body}`;
      });

      contractContext = sections.join('\n\n') + termsContext + obligationsContext;
    }

    // --- Generate answer with Claude ---
    const systemPrompt = `You are ContractOS Query Agent, an AI assistant that answers questions about the user's contract portfolio. You have access to contract data retrieved from the database.

Rules:
- Answer based ONLY on the provided contract context. Do not make up information.
- If the context doesn't contain enough information to answer, say so clearly.
- Reference specific contracts by name when relevant.
- Be concise and actionable.
- Format your response in markdown when helpful (lists, bold for emphasis).
- If asked about dates, amounts, or obligations, be precise and cite the source contract.`;

    const userPrompt = contractContext.length > 0
      ? `Here is the relevant contract data:\n\n${contractContext}\n\n---\n\nUser question: ${question}`
      : `No contracts were found in the database.\n\nUser question: ${question}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.type === 'text' ? block.text : '')
      .join('\n');

    // Build source references
    const sources = contractIds.length > 0
      ? await (async () => {
          const { data: contracts } = await admin
            .from('contracts')
            .select('id, title, document_type')
            .in('id', contractIds)
            .is('deleted_at', null);
          return (contracts ?? []).map((c) => ({
            id: c.id,
            title: c.title,
            document_type: c.document_type,
          }));
        })()
      : [];

    return NextResponse.json({
      answer,
      sources,
      chunks_used: contractIds.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Query API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
