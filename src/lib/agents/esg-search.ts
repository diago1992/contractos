import Anthropic from '@anthropic-ai/sdk';
import type { EsgSearchResult } from '@/types/contracts';

export async function searchVendorEsg(vendorName: string): Promise<EsgSearchResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
      {
        name: 'save_esg_findings',
        description: 'Save ESG research findings for a vendor',
        input_schema: {
          type: 'object' as const,
          properties: {
            summary: { type: 'string', description: 'Brief summary of ESG profile' },
            findings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'ESG metric name (e.g. Carbon Neutral Commitment, Modern Slavery Statement)' },
                  value: { type: 'string', description: 'The finding or status' },
                  status: { type: 'string', enum: ['confirmed', 'partial', 'not-found'] },
                  source_text: { type: 'string', description: 'Relevant excerpt from source' },
                  source_url: { type: 'string', description: 'URL of the source' },
                },
                required: ['label', 'value', 'status', 'source_text', 'source_url'],
              },
            },
          },
          required: ['summary', 'findings'],
        },
      },
    ],
    tool_choice: { type: 'auto' },
    messages: [{
      role: 'user',
      content: `Research the ESG (Environmental, Social, and Governance) profile of "${vendorName}".

Search for:
1. Carbon neutral / net zero commitments
2. Modern slavery statement
3. Diversity & inclusion policies
4. Environmental certifications (ISO 14001, etc.)
5. Sustainability reports
6. Data privacy certifications (SOC 2, ISO 27001)
7. Supply chain ethics policies
8. Community engagement programs

Use web search to find current information, then save your findings using the save_esg_findings tool. For each finding, indicate whether it was confirmed, partially found, or not found.`,
    }],
  });

  // Find the tool_use response for save_esg_findings
  const toolUse = response.content.find(
    block => block.type === 'tool_use' && block.name === 'save_esg_findings'
  );

  if (!toolUse || toolUse.type !== 'tool_use') {
    return { summary: 'ESG search completed but no structured results returned.', findings: [] };
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    summary: typeof input.summary === 'string' ? input.summary : '',
    findings: Array.isArray(input.findings) ? input.findings.map((f: Record<string, unknown>) => ({
      label: String(f.label || ''),
      value: String(f.value || ''),
      status: (['confirmed', 'partial', 'not-found'].includes(String(f.status)) ? String(f.status) : 'not-found') as 'confirmed' | 'partial' | 'not-found',
      source_text: String(f.source_text || ''),
      source_url: String(f.source_url || ''),
    })) : [],
  };
}
