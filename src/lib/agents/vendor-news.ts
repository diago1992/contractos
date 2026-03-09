import Anthropic from '@anthropic-ai/sdk';
import type { NewsItem } from '@/types/contracts';

export async function searchVendorNews(vendorName: string): Promise<NewsItem[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      {
        name: 'save_news_results',
        description: 'Save news articles found about a vendor',
        input_schema: {
          type: 'object' as const,
          properties: {
            articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  headline: { type: 'string' },
                  url: { type: 'string' },
                  source: { type: 'string' },
                  date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
                  snippet: { type: 'string', description: 'Brief summary of the article' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                },
                required: ['headline', 'url', 'source', 'date', 'snippet', 'sentiment'],
              },
            },
          },
          required: ['articles'],
        },
      },
    ],
    tool_choice: { type: 'auto' },
    messages: [{
      role: 'user',
      content: `Search for recent news about "${vendorName}" that would be relevant to a business relationship. Focus on:
- Financial news (earnings, funding, acquisitions)
- Legal/regulatory issues
- Product/service announcements
- Leadership changes
- Security incidents or data breaches
- Partnerships and major contracts

Find up to 6 recent articles, then save them using the save_news_results tool. Classify each article's sentiment as positive, neutral, or negative from the perspective of a customer/partner.`,
    }],
  });

  const toolUse = response.content.find(
    block => block.type === 'tool_use' && block.name === 'save_news_results'
  );

  if (!toolUse || toolUse.type !== 'tool_use') {
    return [];
  }

  const input = toolUse.input as Record<string, unknown>;
  const articles = Array.isArray(input.articles) ? input.articles : [];
  return articles.map((a: Record<string, unknown>) => ({
    headline: String(a.headline || ''),
    url: String(a.url || ''),
    source: String(a.source || ''),
    date: String(a.date || ''),
    snippet: String(a.snippet || ''),
    sentiment: (['positive', 'neutral', 'negative'].includes(String(a.sentiment)) ? String(a.sentiment) : 'neutral') as 'positive' | 'neutral' | 'negative',
  }));
}
