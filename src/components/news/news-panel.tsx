"use client";

import type { NewsItem } from '@/types/contracts';

interface NewsPanelProps {
  articles: NewsItem[];
  isLoading: boolean;
}

export function NewsPanel({ articles, isLoading }: NewsPanelProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="spinner" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-50)', textAlign: 'center', padding: 40 }}>
        Select a vendor and click Refresh to search for news.
      </p>
    );
  }

  return (
    <div>
      {articles.map((article, i) => (
        <div key={i} className={`news-card ${article.sentiment}`}>
          <h4>{article.headline}</h4>
          <p>{article.snippet}</p>
          <div className="news-meta">
            <span>{article.source}</span>
            <span>{article.date}</span>
            <span className={`news-sentiment ${article.sentiment}`}>
              {article.sentiment === 'positive' ? '+ Positive' : article.sentiment === 'negative' ? '- Negative' : '~ Neutral'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
