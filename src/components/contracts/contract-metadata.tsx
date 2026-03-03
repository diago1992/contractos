'use client';

import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/lib/utils/constants';
import { formatDate } from '@/lib/utils/formatters';
import type { Contract } from '@/types/contracts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractMetadataProps {
  contract: Contract;
  className?: string;
}

// ---------------------------------------------------------------------------
// Metadata field helper
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractMetadata({ contract, className }: ContractMetadataProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      <Field label="Counterparty">{contract.counterparty_name}</Field>

      <Field label="Document Type">
        {contract.document_type ? DOCUMENT_TYPE_LABELS[contract.document_type] : '\u2014'}
      </Field>

      <Field label="Effective Date">{formatDate(contract.effective_date)}</Field>

      <Field label="Expiry Date">{formatDate(contract.expiry_date)}</Field>

      <Field label="Notice Period">
        {contract.notice_period_days !== null
          ? `${contract.notice_period_days} day${contract.notice_period_days !== 1 ? 's' : ''}`
          : '\u2014'}
      </Field>

      <Field label="Auto Renewal">
        {contract.auto_renewal ? 'Yes' : 'No'}
      </Field>

      <Field label="Renewal Term">
        {contract.renewal_term_months !== null
          ? `${contract.renewal_term_months} month${contract.renewal_term_months !== 1 ? 's' : ''}`
          : '\u2014'}
      </Field>

      <Field label="Governing Law">
        {contract.governing_law ?? '\u2014'}
      </Field>
    </dl>
  );
}
