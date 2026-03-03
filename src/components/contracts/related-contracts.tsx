"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Link2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LinkContractDialog } from '@/components/contracts/link-contract-dialog';
import { useContractLinks } from '@/hooks/use-contract-links';
import { LINK_TYPE_LABELS, LINK_TYPE_COLORS } from '@/lib/utils/constants';

interface RelatedContractsProps {
  contractId: string;
}

export function RelatedContracts({ contractId }: RelatedContractsProps) {
  const { links, isLoading, deleteLink } = useContractLinks(contractId);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Related Contracts
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Link
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : links.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No linked contracts yet
            </p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={LINK_TYPE_COLORS[link.link_type || 'related'] || LINK_TYPE_COLORS.related}>
                      {LINK_TYPE_LABELS[link.link_type || 'related'] || link.link_type || 'Related'}
                    </Badge>
                    <Link
                      href={`/contracts/${link.related_contract_id}`}
                      className="text-sm font-medium hover:underline truncate"
                    >
                      {link.related_contract_title}
                    </Link>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({link.direction === 'parent' ? 'child of this' : 'parent of this'})
                    </span>
                  </div>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Remove link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LinkContractDialog
        contractId={contractId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
