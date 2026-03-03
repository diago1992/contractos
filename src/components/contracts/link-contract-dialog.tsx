"use client";

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContractLinks } from '@/hooks/use-contract-links';
import { createClient } from '@/lib/supabase/client';
import { LINK_TYPE_LABELS } from '@/lib/utils/constants';

const LINK_TYPES = ['amendment', 'addendum', 'renewal', 'related'] as const;
const DIRECTIONS = [
  { value: 'parent' as const, label: 'This contract is the parent' },
  { value: 'child' as const, label: 'This contract is the child' },
];

interface LinkContractDialogProps {
  contractId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  title: string;
  counterparty_name: string | null;
}

export function LinkContractDialog({ contractId, open, onOpenChange }: LinkContractDialogProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<string>('related');
  const [direction, setDirection] = useState<'parent' | 'child'>('parent');
  const [searching, setSearching] = useState(false);

  const { createLink, isCreating } = useContractLinks(contractId);

  // Search for contracts
  useEffect(() => {
    if (!open || search.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('contracts')
        .select('id, title, counterparty_name')
        .neq('id', contractId)
        .ilike('title', `%${search}%`)
        .is('deleted_at', null)
        .limit(10);

      setResults(data ?? []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, open, contractId]);

  const handleSubmit = () => {
    if (!selectedId) return;
    createLink(
      { targetContractId: selectedId, linkType, direction },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSearch('');
          setSelectedId(null);
          setLinkType('related');
          setDirection('parent');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Link Contract</DialogTitle>
          <DialogDescription>
            Search for a contract and define the relationship
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contracts by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedId(null); }}
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Search results */}
          {(results.length > 0 || searching) && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {searching ? (
                <p className="p-3 text-sm text-muted-foreground">Searching...</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedId(r.id); setSearch(r.title); setResults([]); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      selectedId === r.id ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="font-medium">{r.title}</span>
                    {r.counterparty_name && (
                      <span className="text-muted-foreground ml-2">
                        - {r.counterparty_name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Link type selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Link Type</label>
            <div className="flex flex-wrap gap-2">
              {LINK_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setLinkType(type)}
                  className="focus:outline-none"
                >
                  <Badge
                    variant={linkType === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                  >
                    {LINK_TYPE_LABELS[type]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Direction selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Direction</label>
            <div className="space-y-1.5">
              {DIRECTIONS.map((d) => (
                <label key={d.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={d.value}
                    checked={direction === d.value}
                    onChange={() => setDirection(d.value)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm">{d.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedId || isCreating}>
            {isCreating ? 'Linking...' : 'Link Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
