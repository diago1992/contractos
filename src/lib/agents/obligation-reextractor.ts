import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/server';

const obligationsTool: Anthropic.Tool = {
  name: 'save_obligations',
  description: 'Save extracted obligations from a contract',
  input_schema: {
    type: 'object' as const,
    properties: {
      obligations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            obligated_party: { type: 'string' },
            due_date: { type: ['string', 'null'] },
            risk: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            category: { type: 'string', enum: ['payment', 'notice', 'compliance', 'reporting', 'operational', 'legal'] },
          },
          required: ['title', 'description', 'obligated_party', 'risk', 'category'],
        },
      },
    },
    required: ['obligations'],
  },
};

export async function reextractObligations(contractId: string): Promise<{ count: number }> {
  const supabase = createAdminClient();

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
    tools: [obligationsTool],
    tool_choice: { type: 'tool', name: 'save_obligations' },
    messages: [{
      role: 'user',
      content: `You are a legal analyst at MoneyMe. Extract ALL contractual obligations from this ${(contract.document_type || 'contract').replace(/_/g, ' ')}.

For each obligation identify:
- Who is obligated ("us" for MoneyMe, or the counterparty name)
- Due dates or deadlines if specified
- Risk level (High/Medium/Low) — High = financial penalties or termination risk, Medium = operational impact, Low = administrative
- Category: payment, notice, compliance, reporting, operational, or legal

Document:
---
${truncatedText}
---

Extract all obligations using the save_obligations tool.`,
    }],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI did not return structured obligations');
  }

  const input = toolUse.input as Record<string, unknown>;
  const obligations = Array.isArray(input.obligations) ? input.obligations : [];

  // Delete existing obligations for this contract
  await supabase.from('obligations').delete().eq('contract_id', contractId);

  // Insert new obligations
  if (obligations.length > 0) {
    const rows = obligations.map((o: Record<string, unknown>) => ({
      contract_id: contractId,
      title: String(o.title || ''),
      description: String(o.description || ''),
      obligated_party: String(o.obligated_party || ''),
      due_date: typeof o.due_date === 'string' ? o.due_date : null,
      risk: typeof o.risk === 'string' ? o.risk : 'Medium',
      category: typeof o.category === 'string' ? o.category : 'operational',
      status: 'pending' as const,
    }));
    const { error: insertError } = await supabase.from('obligations').insert(rows);
    if (insertError) throw insertError;
  }

  return { count: obligations.length };
}
