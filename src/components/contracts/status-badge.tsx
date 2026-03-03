'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUS_COLORS,
  EXTRACTION_STATUS_LABELS,
  EXTRACTION_STATUS_COLORS,
} from '@/lib/utils/constants';
import type { ContractStatus, ExtractionStatus } from '@/types/contracts';

interface StatusBadgeProps {
  status: ContractStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(CONTRACT_STATUS_COLORS[status], className)}>
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}

interface ExtractionBadgeProps {
  status: ExtractionStatus;
  className?: string;
}

export function ExtractionBadge({ status, className }: ExtractionBadgeProps) {
  return (
    <Badge className={cn(EXTRACTION_STATUS_COLORS[status], className)}>
      {EXTRACTION_STATUS_LABELS[status]}
    </Badge>
  );
}
