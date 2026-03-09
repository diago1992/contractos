import Anthropic from '@anthropic-ai/sdk';

export async function generateVendorDescription(
  vendorName: string,
  context?: { industry?: string; contracts?: string[] }
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextInfo = context
    ? `\nAdditional context:\n- Industry: ${context.industry || 'Unknown'}\n- Active contracts: ${context.contracts?.join(', ') || 'None'}`
    : '';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Write a brief (2-3 sentences) professional description of "${vendorName}" as a vendor/supplier, suitable for an internal contract management system. Focus on what they do, their relevance to MoneyMe (an Australian financial services company), and any notable aspects of the business relationship.${contextInfo}

Write the description directly, no preamble.`,
    }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '';
}
