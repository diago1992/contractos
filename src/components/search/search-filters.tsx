"use client";

import { Select, SelectOption } from '@/components/ui/select';
import { DOCUMENT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/utils/constants';
import type { ContractFilters, DocumentType, ContractStatus } from '@/types/contracts';

interface SearchFiltersProps {
  filters: ContractFilters;
  onFiltersChange: (filters: ContractFilters) => void;
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  return (
    <div className="flex shrink-0 flex-wrap gap-3">
      <Select
        value={filters.document_type ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, document_type: (e.target.value || undefined) as DocumentType | undefined })}
        className="w-auto"
      >
        <SelectOption value="">All Types</SelectOption>
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
          <SelectOption key={key} value={key}>{label}</SelectOption>
        ))}
      </Select>

      <Select
        value={filters.status ?? ''}
        onChange={(e) => onFiltersChange({ ...filters, status: (e.target.value || undefined) as ContractStatus | undefined })}
        className="w-auto"
      >
        <SelectOption value="">All Statuses</SelectOption>
        {Object.entries(CONTRACT_STATUS_LABELS).map(([key, label]) => (
          <SelectOption key={key} value={key}>{label}</SelectOption>
        ))}
      </Select>
    </div>
  );
}
