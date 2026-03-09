import Anthropic from '@anthropic-ai/sdk';
import type { NewsItem } from '@/types/contracts';

// In-memory cache: vendor name → { articles, timestamp }
const newsCache = new Map<string, { articles: NewsItem[]; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function searchVendorNews(vendorName: string): Promise<NewsItem[]> {
  // Check cache
  const key = vendorName.toLowerCase().trim();
  const cached = newsCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.articles;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
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
      content: `Search for recent news about "${vendorName}" that would be relevant to managing a commercial contract relationship. Focus on:
- Financial health: earnings, credit rating changes, funding, bankruptcy risk
- Legal & regulatory: lawsuits, fines, regulatory actions, compliance failures
- Security & data: breaches, incidents, vulnerabilities
- Operational risk: outages, service disruptions, leadership departures
- M&A activity: acquisitions, mergers, being acquired (may affect contract continuity)
- Pricing & licensing: price changes, licensing model changes

Do NOT include generic product announcements, marketing content, or press releases.
Only include news that would inform risk assessment or renewal decisions.

Find up to 6 recent articles, then save them using the save_news_results tool. Classify each article's sentiment as positive, neutral, or negative from the perspective of a customer evaluating vendor risk.`,
    }],
  });

  const toolUse = response.content.find(
    block => block.type === 'tool_use' && block.name === 'save_news_results'
  );

  if (!toolUse || toolUse.type !== 'tool_use') {
    return [];
  }

  const input = toolUse.input as Record<string, unknown>;
  const rawArticles = Array.isArray(input.articles) ? input.articles : [];
  const articles = rawArticles.map((a: Record<string, unknown>) => ({
    headline: String(a.headline || ''),
    url: String(a.url || ''),
    source: String(a.source || ''),
    date: String(a.date || ''),
    snippet: String(a.snippet || ''),
    sentiment: (['positive', 'neutral', 'negative'].includes(String(a.sentiment)) ? String(a.sentiment) : 'neutral') as 'positive' | 'neutral' | 'negative',
  }));

  // Cache results
  newsCache.set(key, { articles, ts: Date.now() });

  return articles;
}
