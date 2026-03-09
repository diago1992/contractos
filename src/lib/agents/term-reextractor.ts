import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/server';

const termsTool: Anthropic.Tool = {
  name: 'save_commercial_terms',
  description: 'Save extracted commercial terms from a contract',
  input_schema: {
    type: 'object' as const,
    properties: {
      terms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            term_type: { type: 'string', description: 'Type: payment, pricing, penalty, liability_cap, insurance, etc.' },
            description: { type: 'string' },
            amount: { type: ['number', 'null'] },
            currency: { type: 'string' },
            frequency: { type: ['string', 'null'] },
          },
          required: ['term_type', 'description'],
        },
      },
    },
    required: ['terms'],
  },
};

export async function reextractTerms(contractId: string): Promise<{ count: number }> {
  const supabase = createAdminClient();

  // Fetch contract text
  const { data: contract, error: fetchError } = await supabase
    .from('contracts')
    .select('raw_text, title, document_type')
    .eq('id', contractId)
    .single();

  if (fetchError || !contract?.raw_text) {
    throw new Error('Contract text not found');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const truncatedText = contract.raw_text.slice(0, 100000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [termsTool],
    tool_choice: { type: 'tool', name: 'save_commercial_terms' },
    messages: [{
      role: 'user',
      content: `You are a legal analyst at MoneyMe. Extract ALL commercial and financial terms from this ${(contract.document_type || 'contract').replace(/_/g, ' ')}.

Include: payment terms, pricing, fees, penalties, liability caps, insurance requirements, SLA commitments, volume commitments, price escalation clauses, termination fees, etc.

Document:
---
${truncatedText}
---

Extract all terms using the save_commercial_terms tool.`,
    }],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI did not return structured terms');
  }

  const input = toolUse.input as Record<string, unknown>;
  const terms = Array.isArray(input.terms) ? input.terms : [];

  // Delete existing terms for this contract
  await supabase.from('commercial_terms').delete().eq('contract_id', contractId);

  // Insert new terms
  if (terms.length > 0) {
    const rows = terms.map((t: Record<string, unknown>) => ({
      contract_id: contractId,
      term_type: String(t.term_type || 'other'),
      description: String(t.description || ''),
      amount: typeof t.amount === 'number' ? t.amount : null,
      currency: typeof t.currency === 'string' ? t.currency : 'AUD',
      frequency: typeof t.frequency === 'string' ? t.frequency : null,
    }));
    const { error: insertError } = await supabase.from('commercial_terms').insert(rows);
    if (insertError) throw insertError;
  }

  return { count: terms.length };
}
