// Chart color palette — works in both light and dark modes
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
];

export const STATUS_CHART_COLORS: Record<string, string> = {
  draft: '#9ca3af',
  active: '#10b981',
  under_review: '#f59e0b',
  expired: '#ef4444',
  terminated: '#dc2626',
};

export const RISK_CHART_COLORS: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export const OBLIGATION_CHART_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  completed: '#10b981',
  overdue: '#ef4444',
  waived: '#6b7280',
};
