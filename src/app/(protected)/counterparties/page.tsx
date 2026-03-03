"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/search/search-bar';
import { useCounterparties, type CounterpartyGroup } from '@/hooks/use-counterparties';
import { DOCUMENT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/utils/constants';
import type { DocumentType, ContractStatus } from '@/types/contracts';

export default function CounterpartiesPage() {
  const [search, setSearch] = useState('');
  const { data: groups, isLoading, error } = useCounterparties(search || undefined);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Counterparties</h1>
          <p className="mt-1 text-muted-foreground">
            Contracts grouped by counterparty.
          </p>
        </div>

        {/* Search */}
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search counterparties..."
          className="max-w-sm"
        />

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error instanceof Error ? error.message : 'An error occurred'}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (groups ?? []).length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search ? `No counterparties matching "${search}"` : 'No contracts with counterparty names found.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Counterparty groups */}
        <div className="space-y-3">
          {(groups ?? []).map((group) => (
            <CounterpartyCard key={group.counterparty_name} group={group} />
          ))}
        </div>

        {/* Summary */}
        {!isLoading && (groups ?? []).length > 0 && (
          <p className="text-sm text-muted-foreground">
            {groups!.length} counterpart{groups!.length !== 1 ? 'ies' : 'y'},{' '}
            {groups!.reduce((sum, g) => sum + g.contracts.length, 0)} contracts
          </p>
        )}
      </div>
    </AppLayout>
  );
}

function CounterpartyCard({ group }: { group: CounterpartyGroup }) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = group.contracts.filter((c) => c.status === 'active').length;
  const expiredCount = group.contracts.filter((c) => c.status === 'expired').length;

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">{group.counterparty_name}</p>
            <p className="text-sm text-muted-foreground">
              {group.contracts.length} contract{group.contracts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>
          )}
          {expiredCount > 0 && (
            <Badge variant="destructive" className="text-xs">{expiredCount} expired</Badge>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <CardContent className="border-t pt-3 pb-4">
          <div className="space-y-2">
            {group.contracts.map((c) => (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{c.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.document_type && (
                    <Badge variant="outline" className="text-xs">
                      {DOCUMENT_TYPE_LABELS[c.document_type as DocumentType] ?? c.document_type}
                    </Badge>
                  )}
                  <Badge
                    variant={c.status === 'active' ? 'secondary' : c.status === 'expired' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {CONTRACT_STATUS_LABELS[c.status as ContractStatus] ?? c.status}
                  </Badge>
                  {c.expiry_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.expiry_date).toLocaleDateString('en-AU')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
