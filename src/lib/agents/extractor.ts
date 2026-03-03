import Anthropic from '@anthropic-ai/sdk';
import type { ExtractionResult } from '@/types/contracts';

const extractionTool: Anthropic.Tool = {
  name: 'save_contract_metadata',
  description: 'Save the extracted metadata from a commercial contract document',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Short descriptive title for this contract' },
      counterparty_name: { type: 'string', description: 'The other party in the contract (not MoneyMe)' },
      summary: { type: 'string', description: 'A 2-3 sentence summary of the contract purpose and key terms' },
      effective_date: { type: ['string', 'null'], description: 'Contract start/effective date in YYYY-MM-DD format, or null if not found' },
      expiry_date: { type: ['string', 'null'], description: 'Contract end/expiry date in YYYY-MM-DD format, or null if not found' },
      notice_period_days: { type: ['integer', 'null'], description: 'Notice period in days required before termination, or null' },
      auto_renewal: { type: 'boolean', description: 'Whether the contract auto-renews' },
      renewal_term_months: { type: ['integer', 'null'], description: 'Renewal period in months, or null' },
      governing_law: { type: ['string', 'null'], description: 'Governing law jurisdiction, or null' },
      commercial_terms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            term_type: { type: 'string', description: 'Type of term: payment, pricing, penalty, liability_cap, insurance, etc.' },
            description: { type: 'string', description: 'Description of the commercial term' },
            amount: { type: ['number', 'null'], description: 'Monetary amount if applicable' },
            currency: { type: 'string', description: 'Currency code, default AUD' },
            frequency: { type: ['string', 'null'], description: 'Payment/billing frequency if applicable' },
          },
          required: ['term_type', 'description'],
        },
      },
      obligations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short title for the obligation' },
            description: { type: 'string', description: 'Full description of what needs to be done' },
            obligated_party: { type: 'string', description: 'Who is obligated: "us" (MoneyMe) or the counterparty name' },
            due_date: { type: ['string', 'null'], description: 'Due date in YYYY-MM-DD format, or null if ongoing' },
          },
          required: ['title', 'description', 'obligated_party'],
        },
      },
      risk_flags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short title for the risk' },
            description: { type: 'string', description: 'Description of the risk and its potential impact' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Risk severity level' },
          },
          required: ['title', 'description', 'severity'],
        },
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Relevant tags for categorization (e.g., "technology", "consulting", "multi-year")',
      },
    },
    required: ['title', 'counterparty_name', 'summary', 'auto_renewal', 'commercial_terms', 'obligations', 'risk_flags', 'tags'],
  },
};

export async function extractContractMetadata(text: string, documentType: string): Promise<ExtractionResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Truncate very long documents to ~100k chars to stay within context
  const truncatedText = text.slice(0, 100000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [extractionTool],
    tool_choice: { type: 'tool', name: 'save_contract_metadata' },
    messages: [{
      role: 'user',
      content: `You are a legal analyst at MoneyMe, an Australian financial services company.
Analyze this ${documentType.replace(/_/g, ' ')} and extract all relevant metadata.

Be thorough in identifying:
- All commercial/financial terms (payments, fees, penalties, caps)
- All obligations for both parties
- Any risk flags (unusual clauses, one-sided terms, missing protections, auto-renewal traps, unlimited liability)

Document text:
---
${truncatedText}
---

Extract all metadata using the save_contract_metadata tool.`,
    }],
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('AI did not return structured extraction');
  }

  return validateExtractionResult(toolUse.input as Record<string, unknown>);
}

function validateExtractionResult(raw: Record<string, unknown>): ExtractionResult {
  // Required string fields — fall back to safe defaults
  const title = typeof raw.title === 'string' && raw.title.length > 0
    ? raw.title
    : 'Untitled Contract';
  const counterparty_name = typeof raw.counterparty_name === 'string'
    ? raw.counterparty_name
    : 'Unknown';
  const summary = typeof raw.summary === 'string'
    ? raw.summary
    : '';

  // Optional scalar fields
  const effective_date = typeof raw.effective_date === 'string' ? raw.effective_date : null;
  const expiry_date = typeof raw.expiry_date === 'string' ? raw.expiry_date : null;
  const notice_period_days = typeof raw.notice_period_days === 'number' ? raw.notice_period_days : null;
  const auto_renewal = typeof raw.auto_renewal === 'boolean' ? raw.auto_renewal : false;
  const renewal_term_months = typeof raw.renewal_term_months === 'number' ? raw.renewal_term_months : null;
  const governing_law = typeof raw.governing_law === 'string' ? raw.governing_law : null;

  // Array fields — ensure they are arrays
  const commercial_terms = Array.isArray(raw.commercial_terms) ? raw.commercial_terms : [];
  const obligations = Array.isArray(raw.obligations) ? raw.obligations : [];
  const risk_flags = Array.isArray(raw.risk_flags) ? raw.risk_flags : [];
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [];

  return {
    title,
    counterparty_name,
    summary,
    effective_date,
    expiry_date,
    notice_period_days,
    auto_renewal,
    renewal_term_months,
    governing_law,
    commercial_terms,
    obligations,
    risk_flags,
    tags,
  };
}
