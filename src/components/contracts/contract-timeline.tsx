'use client';

import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractTimelineProps {
  effectiveDate?: string | null;
  expiryDate?: string | null;
  noticePeriodDays?: number | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number between 0 and 100. */
function clamp(value: number, min = 0, max = 100): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractTimeline({
  effectiveDate,
  expiryDate,
  noticePeriodDays,
  className,
}: ContractTimelineProps) {
  const timeline = useMemo(() => {
    if (!effectiveDate || !expiryDate) return null;

    const start = new Date(effectiveDate);
    const end = new Date(expiryDate);
    const now = new Date();

    const totalDays = differenceInDays(end, start);
    if (totalDays <= 0) return null;

    // Current position as a percentage of the full span
    const elapsedDays = differenceInDays(now, start);
    const currentPct = clamp((elapsedDays / totalDays) * 100);

    // Notice date position
    let noticePct: number | null = null;
    let noticeDate: Date | null = null;
    if (noticePeriodDays && noticePeriodDays > 0) {
      noticeDate = new Date(end);
      noticeDate.setDate(noticeDate.getDate() - noticePeriodDays);
      const noticeDaysFromStart = differenceInDays(noticeDate, start);
      noticePct = clamp((noticeDaysFromStart / totalDays) * 100);
    }

    // Determine phase
    let phase: 'before' | 'active' | 'notice' | 'expired';
    if (now < start) {
      phase = 'before';
    } else if (now > end) {
      phase = 'expired';
    } else if (noticeDate && now >= noticeDate) {
      phase = 'notice';
    } else {
      phase = 'active';
    }

    return { totalDays, currentPct, noticePct, noticeDate, phase, start, end };
  }, [effectiveDate, expiryDate, noticePeriodDays]);

  // ---------------------------------------------------------------------------
  // No data fallback
  // ---------------------------------------------------------------------------

  if (!timeline) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Timeline unavailable — effective date and expiry date are required.
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Phase colour map
  // ---------------------------------------------------------------------------

  const barColorByPhase: Record<string, string> = {
    before: 'bg-gray-300',
    active: 'bg-green-500',
    notice: 'bg-yellow-500',
    expired: 'bg-red-500',
  };

  const dotColorByPhase: Record<string, string> = {
    before: 'bg-gray-500',
    active: 'bg-green-600',
    notice: 'bg-yellow-600',
    expired: 'bg-red-600',
  };

  const phaseLabel: Record<string, string> = {
    before: 'Not yet started',
    active: 'Active',
    notice: 'Within notice period',
    expired: 'Expired',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn('space-y-3', className)}>
      {/* Phase label */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Contract Timeline
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            {
              'bg-gray-100 text-gray-700': timeline.phase === 'before',
              'bg-green-100 text-green-700': timeline.phase === 'active',
              'bg-yellow-100 text-yellow-700': timeline.phase === 'notice',
              'bg-red-100 text-red-700': timeline.phase === 'expired',
            },
          )}
        >
          {phaseLabel[timeline.phase]}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        {/* Filled portion up to current date */}
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all', barColorByPhase[timeline.phase])}
          style={{ width: `${timeline.currentPct}%` }}
        />

        {/* Notice period marker */}
        {timeline.noticePct !== null && (
          <div
            className="absolute inset-y-0 w-px bg-yellow-600"
            style={{ left: `${timeline.noticePct}%` }}
            title={`Notice date: ${formatDate(timeline.noticeDate!.toISOString())}`}
          />
        )}

        {/* Current date indicator */}
        <div
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow',
            dotColorByPhase[timeline.phase],
          )}
          style={{ left: `${timeline.currentPct}%` }}
          title="Today"
        />
      </div>

      {/* Date labels */}
      <div className="flex items-start justify-between text-xs text-muted-foreground">
        <div className="text-left">
          <div className="font-medium">Effective</div>
          <div>{formatDate(effectiveDate)}</div>
        </div>

        {timeline.noticePct !== null && timeline.noticeDate && (
          <div className="text-center">
            <div className="font-medium text-yellow-600">Notice</div>
            <div>{formatDate(timeline.noticeDate.toISOString())}</div>
          </div>
        )}

        <div className="text-right">
          <div className="font-medium">Expiry</div>
          <div>{formatDate(expiryDate)}</div>
        </div>
      </div>
    </div>
  );
}
