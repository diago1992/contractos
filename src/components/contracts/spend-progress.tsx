'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface SpendProgressProps {
  totalSpend: number;
  contractValue: number;
  currency?: string;
}

export function SpendProgress({ totalSpend, contractValue, currency = 'AUD' }: SpendProgressProps) {
  const ratio = contractValue > 0 ? totalSpend / contractValue : 0;
  const percentage = Math.min(Math.round(ratio * 100), 100);

  const barColor =
    ratio >= 1.0
      ? 'bg-red-500'
      : ratio >= 0.8
        ? 'bg-yellow-500'
        : 'bg-green-500';

  const statusLabel =
    ratio >= 1.0
      ? 'Exceeded'
      : ratio >= 0.8
        ? 'Warning'
        : 'On Track';

  const statusColor =
    ratio >= 1.0
      ? 'text-red-600 dark:text-red-400'
      : ratio >= 0.8
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-green-600 dark:text-green-400';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Spend vs Contract Value</CardTitle>
          <span className={cn('text-sm font-semibold', statusColor)}>{statusLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(totalSpend, currency)} invoiced
          </span>
          <span className="text-muted-foreground">
            {formatCurrency(contractValue, currency)} contract value
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {ratio > 1 ? `${Math.round(ratio * 100)}%` : `${percentage}%`} of contract value consumed
        </p>
      </CardContent>
    </Card>
  );
}
