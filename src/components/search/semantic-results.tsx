"use client";

import Link from 'next/link';
import { FileText, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SemanticSearchResult } from '@/hooks/use-semantic-search';

interface SemanticResultsProps {
  results: SemanticSearchResult[];
  isLoading: boolean;
  error: Error | null;
  query: string;
}

export function SemanticResults({ results, isLoading, error, query }: SemanticResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
          Searching across contract content...
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  if (results.length === 0 && query.trim().length >= 3) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-400" />
        No matching content found for &ldquo;{query}&rdquo;
      </div>
    );
  }

  // Group results by contract
  const grouped = new Map<string, { contract: SemanticSearchResult['contract']; chunks: SemanticSearchResult[] }>();
  for (const result of results) {
    const key = result.contract_id;
    if (!grouped.has(key)) {
      grouped.set(key, { contract: result.contract, chunks: [] });
    }
    grouped.get(key)!.chunks.push(result);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-purple-500" />
        {results.length} result{results.length !== 1 ? 's' : ''} across {grouped.size} contract{grouped.size !== 1 ? 's' : ''}
      </div>

      {Array.from(grouped.entries()).map(([contractId, { contract, chunks }]) => (
        <Card key={contractId}>
          <CardContent className="p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <Link
                href={`/contracts/${contractId}`}
                className="flex items-center gap-2 font-medium hover:underline"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                {contract?.title ?? 'Untitled Contract'}
              </Link>
              <div className="flex items-center gap-2">
                {contract?.status && (
                  <Badge variant="secondary" className="text-xs">
                    {contract.status}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {Math.round(chunks[0].similarity * 100)}% match
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              {chunks.slice(0, 2).map((chunk) => (
                <p
                  key={chunk.chunk_id}
                  className="line-clamp-3 text-sm text-muted-foreground"
                >
                  ...{chunk.content.slice(0, 300)}...
                </p>
              ))}
              {chunks.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{chunks.length - 2} more matching section{chunks.length - 2 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
