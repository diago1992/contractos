'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText, Upload } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StatusBadge, ExtractionBadge } from './status-badge';
import { DOCUMENT_TYPE_LABELS } from '@/lib/utils/constants';
import { formatDate } from '@/lib/utils/formatters';
import type { ContractListItem } from '@/types/contracts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortField =
  | 'title'
  | 'counterparty_name'
  | 'document_type'
  | 'status'
  | 'effective_date'
  | 'expiry_date'
  | 'extraction_status'
  | 'created_at';

export type SortDirection = 'asc' | 'desc';

interface ContractTableProps {
  contracts: ContractListItem[];
  onSort?: (field: SortField, direction: SortDirection) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: SortField;
  label: string;
}

const columns: ColumnDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'counterparty_name', label: 'Counterparty' },
  { key: 'document_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'effective_date', label: 'Start Date' },
  { key: 'expiry_date', label: 'Expiry Date' },
  { key: 'extraction_status', label: 'Extraction' },
];

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function compareValues(
  a: ContractListItem,
  b: ContractListItem,
  field: SortField,
  direction: SortDirection,
): number {
  let aVal: string | null;
  let bVal: string | null;

  switch (field) {
    case 'title':
      aVal = a.title;
      bVal = b.title;
      break;
    case 'counterparty_name':
      aVal = a.counterparty_name;
      bVal = b.counterparty_name;
      break;
    case 'document_type':
      aVal = a.document_type ? DOCUMENT_TYPE_LABELS[a.document_type] : '';
      bVal = b.document_type ? DOCUMENT_TYPE_LABELS[b.document_type] : '';
      break;
    case 'status':
      aVal = a.status;
      bVal = b.status;
      break;
    case 'effective_date':
      aVal = a.effective_date;
      bVal = b.effective_date;
      break;
    case 'expiry_date':
      aVal = a.expiry_date;
      bVal = b.expiry_date;
      break;
    case 'extraction_status':
      aVal = a.extraction_status;
      bVal = b.extraction_status;
      break;
    case 'created_at':
      aVal = a.created_at;
      bVal = b.created_at;
      break;
    default:
      return 0;
  }

  // Handle nulls — push them to the bottom regardless of sort direction
  if (aVal === null && bVal === null) return 0;
  if (aVal === null) return 1;
  if (bVal === null) return -1;

  const cmp = aVal.localeCompare(bVal);
  return direction === 'asc' ? cmp : -cmp;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractTable({
  contracts,
  onSort,
  sortField: controlledSortField,
  sortDirection: controlledSortDirection,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: ContractTableProps) {
  const [internalSortField, setInternalSortField] = useState<SortField>('created_at');
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('desc');

  const sortField = controlledSortField ?? internalSortField;
  const sortDirection = controlledSortDirection ?? internalSortDirection;

  function handleSort(field: SortField) {
    const newDirection =
      field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';

    if (onSort) {
      onSort(field, newDirection);
    } else {
      setInternalSortField(field);
      setInternalSortDirection(newDirection);
    }
  }

  // Apply local sort when no external handler is provided
  const sortedContracts = onSort
    ? contracts
    : [...contracts].sort((a, b) => compareValues(a, b, sortField, sortDirection));

  // Selection handlers
  const allSelected = selectable && contracts.length > 0 && contracts.every((c) => selectedIds.has(c.id));
  const someSelected = selectable && contracts.some((c) => selectedIds.has(c.id));

  function toggleSelectAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(contracts.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  // ---------------------------------------------------------------------------
  // Sort icon
  // ---------------------------------------------------------------------------

  function SortIcon({ field }: { field: SortField }) {
    if (field !== sortField) {
      return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No contracts found</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try adjusting your search or filters, or upload a new contract.
        </p>
        <Link href="/counterparties" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}>
          <Upload className="mr-2 h-4 w-4" />
          Add contract
        </Link>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected && !allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all contracts"
              />
            </TableHead>
          )}
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort(col.key)}
              aria-label={`Sort by ${col.label}${col.key === sortField ? `, currently ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}
              role="columnheader"
              aria-sort={col.key === sortField ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              {col.label}
              <SortIcon field={col.key} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {sortedContracts.map((contract) => (
          <TableRow key={contract.id} className="group">
            {selectable && (
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(contract.id)}
                  onChange={() => toggleSelect(contract.id)}
                  aria-label={`Select ${contract.title}`}
                />
              </TableCell>
            )}
            <TableCell>
              <Link
                href={`/contracts/${contract.id}`}
                className={cn(
                  'font-medium text-foreground underline-offset-4',
                  'group-hover:underline',
                )}
              >
                {contract.title}
              </Link>
            </TableCell>

            <TableCell className="text-muted-foreground">
              {contract.counterparty_name}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {contract.document_type ? DOCUMENT_TYPE_LABELS[contract.document_type] : '\u2014'}
            </TableCell>

            <TableCell>
              <StatusBadge status={contract.status} />
            </TableCell>

            <TableCell className="text-muted-foreground">
              {formatDate(contract.effective_date)}
            </TableCell>

            <TableCell className="text-muted-foreground">
              {formatDate(contract.expiry_date)}
            </TableCell>

            <TableCell>
              <ExtractionBadge status={contract.extraction_status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
