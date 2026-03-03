'use client';

import Link from 'next/link';
import { Calendar, Building2, ArrowRight } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatusBadge } from './status-badge';
import { DOCUMENT_TYPE_LABELS } from '@/lib/utils/constants';
import { formatDate, daysUntilExpiry, getExpiryUrgency } from '@/lib/utils/formatters';
import type { ContractListItem } from '@/types/contracts';

// ---------------------------------------------------------------------------
// Urgency colour map
// ---------------------------------------------------------------------------

const urgencyStyles: Record<string, string> = {
  expired: 'text-red-600 dark:text-red-400',
  critical: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  ok: 'text-green-600 dark:text-green-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContractCardProps {
  contract: ContractListItem;
  className?: string;
}

export function ContractCard({ contract, className }: ContractCardProps) {
  const days = daysUntilExpiry(contract.expiry_date);
  const urgency = getExpiryUrgency(contract.expiry_date);

  function renderExpiryInfo() {
    if (days === null || urgency === null) {
      return <span className="text-muted-foreground">No expiry date</span>;
    }

    if (days < 0) {
      return (
        <span className={urgencyStyles.expired}>
          Expired {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago
        </span>
      );
    }

    return (
      <span className={urgencyStyles[urgency]}>
        {days === 0
          ? 'Expires today'
          : `${days} day${days !== 1 ? 's' : ''} remaining`}
      </span>
    );
  }

  return (
    <Link href={`/contracts/${contract.id}`} className="group block">
      <Card
        className={cn(
          'transition-shadow hover:shadow-md',
          className,
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-base group-hover:underline">
              {contract.title}
            </CardTitle>
            <StatusBadge status={contract.status} />
          </div>
          <CardDescription className="line-clamp-1">
            {contract.document_type ? DOCUMENT_TYPE_LABELS[contract.document_type] : 'Unclassified'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{contract.counterparty_name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{formatDate(contract.expiry_date)}</span>
          </div>

          <div className="text-xs font-medium">{renderExpiryInfo()}</div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground">
          <span className="flex items-center gap-1 group-hover:text-foreground">
            View details
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
