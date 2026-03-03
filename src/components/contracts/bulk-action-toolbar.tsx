"use client";

import { useState, useEffect } from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { CONTRACT_STATUS_LABELS } from '@/lib/utils/constants';
import type { ContractStatus } from '@/types/contracts';

interface BulkActionToolbarProps {
  selectedIds: Set<string>;
  onClear: () => void;
}

const STATUSES: ContractStatus[] = ['draft', 'active', 'under_review', 'expired', 'terminated'];

export function BulkActionToolbar({ selectedIds, onClear }: BulkActionToolbarProps) {
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('users').select('role').eq('id', user.id).single()
        .then(({ data }) => { if (data) setUserRole(data.role); });
    });
  }, []);

  const count = selectedIds.size;
  if (count === 0) return null;

  const ids = Array.from(selectedIds);
  const canChangeStatus = userRole === 'reviewer' || userRole === 'admin';
  const canDelete = userRole === 'admin';

  const runBulkAction = async (action: string, payload?: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, contractIds: ids, payload }),
      });

      if (action === 'export_csv') {
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contracts-export-${Date.now()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        onClear();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky bottom-4 z-20 mx-auto w-fit">
      <div className="flex items-center gap-2 rounded-lg border bg-background/95 px-4 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="text-sm font-medium">
          {count} selected
        </span>

        <div className="h-4 w-px bg-border mx-1" />

        {canChangeStatus && (
          <DropdownMenu>
            <DropdownMenuTrigger className="text-sm px-3 py-1.5 rounded-md hover:bg-accent transition-colors" disabled={loading}>
              Change Status
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Set Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => runBulkAction('change_status', { status })}
                >
                  {CONTRACT_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => runBulkAction('export_csv')}
          disabled={loading}
        >
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>

        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Delete ${count} contract${count > 1 ? 's' : ''}?`)) {
                runBulkAction('soft_delete');
              }
            }}
            disabled={loading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}

        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ml-1"
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
