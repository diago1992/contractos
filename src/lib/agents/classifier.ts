import Anthropic from '@anthropic-ai/sdk';
import type { ClassificationResult, DocumentType } from '@/types/contracts';

const DOCUMENT_TYPES: DocumentType[] = [
  'master_services_agreement', 'statement_of_work', 'nda',
  'employment_agreement', 'vendor_agreement', 'lease_agreement',
  'license_agreement', 'amendment', 'addendum', 'other'
];

const classificationTool: Anthropic.Tool = {
  name: 'classify_document',
  description: 'Classify a legal/commercial document into one or more document types',
  input_schema: {
    type: 'object' as const,
    properties: {
      primary_type: {
        type: 'string',
        enum: DOCUMENT_TYPES,
        description: 'The primary/best-fit document type',
      },
      primary_confidence: {
        type: 'number',
        description: 'Confidence score for primary type from 0.0 to 1.0',
      },
      secondary_types: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            document_type: {
              type: 'string',
              enum: DOCUMENT_TYPES,
              description: 'An additional applicable document type',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score from 0.0 to 1.0',
            },
          },
          required: ['document_type', 'confidence'],
        },
        description: 'Additional document types that also apply (e.g. a contract with an appended SOW). Empty array if only one type applies.',
      },
    },
    required: ['primary_type', 'primary_confidence', 'secondary_types'],
  },
};

export async function classifyDocument(text: string): Promise<ClassificationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Use first ~4000 chars for classification (enough context, saves tokens)
  const sample = text.slice(0, 4000);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      tools: [classificationTool],
      tool_choice: { type: 'tool', name: 'classify_document' },
      messages: [{
        role: 'user',
        content: `Classify this legal/commercial document. A document may have MULTIPLE types — for example, a commercial agreement with a Statement of Work appended should be classified as both.

Guidelines:
- Purchase orders, vendor orders, and supplier agreements → vendor_agreement
- SOWs, work orders, and service orders → statement_of_work
- Confidentiality or non-disclosure → nda
- If a document contains multiple sections (e.g. a master agreement with an SOW appended), include ALL applicable types
- The primary_type should be the main/overarching document type
- secondary_types should include any other types that also apply
- Use "other" only if nothing fits

Document text (excerpt):
---
${sample}
---

Classify this document using the classify_document tool.`,
      }],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown API error';
    const isRateLimit =
      err instanceof Anthropic.RateLimitError ||
      (err instanceof Anthropic.APIError && err.status === 429);

    if (isRateLimit) {
      throw new Error(`Classification rate-limited by Anthropic API. Please retry later. (${message})`);
    }

    throw new Error(`Classification API call failed: ${message}`);
  }

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    console.error('Classifier: no tool_use block returned, falling back to "other"');
    return { document_type: 'other', confidence: 0.1, all_types: [{ document_type: 'other', confidence: 0.1 }] };
  }

  const input = toolUse.input as {
    primary_type?: string;
    primary_confidence?: number;
    secondary_types?: Array<{ document_type?: string; confidence?: number }>;
  };

  const primaryType = (input.primary_type as DocumentType) || 'other';
  const primaryConfidence = typeof input.primary_confidence === 'number' ? input.primary_confidence : 0.5;

  const validPrimary = DOCUMENT_TYPES.includes(primaryType) ? primaryType : 'other';

  // Build all_types array: primary first, then valid secondaries
  const allTypes: { document_type: DocumentType; confidence: number }[] = [
    { document_type: validPrimary, confidence: primaryConfidence },
  ];

  if (Array.isArray(input.secondary_types)) {
    for (const st of input.secondary_types) {
      const dt = st.document_type as DocumentType;
      if (dt && DOCUMENT_TYPES.includes(dt) && dt !== validPrimary) {
        allTypes.push({
          document_type: dt,
          confidence: typeof st.confidence === 'number' ? st.confidence : 0.5,
        });
      }
    }
  }

  return {
    document_type: validPrimary,
    confidence: primaryConfidence,
    all_types: allTypes,
  };
}
