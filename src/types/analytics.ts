export interface StatusBreakdownItem {
  status: string;
  label: string;
  count: number;
}

export interface TypeDistributionItem {
  type: string;
  label: string;
  count: number;
}

export interface ExpiryTimelineItem {
  month: string;
  count: number;
}

export interface RiskSummaryItem {
  severity: string;
  label: string;
  count: number;
}

export interface ContractValueItem {
  month: string;
  value: number;
}

export interface ObligationBreakdownItem {
  status: string;
  label: string;
  count: number;
}

export interface AnalyticsTotals {
  totalContracts: number;
  totalValue: number;
  avgValue: number;
}

export interface AnalyticsData {
  statusBreakdown: StatusBreakdownItem[];
  typeDistribution: TypeDistributionItem[];
  expiryTimeline: ExpiryTimelineItem[];
  riskSummary: RiskSummaryItem[];
  contractValueOverTime: ContractValueItem[];
  obligationBreakdown: ObligationBreakdownItem[];
  totals: AnalyticsTotals;
}
