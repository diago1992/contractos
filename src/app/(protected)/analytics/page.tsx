'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  CHART_COLORS,
  STATUS_CHART_COLORS,
  RISK_CHART_COLORS,
  OBLIGATION_CHART_COLORS,
} from '@/lib/utils/chart-colors';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-2 h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-lg font-semibold">No analytics data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload contracts to see analytics.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Contracts" value={data.totals.totalContracts.toLocaleString()} />
          <StatCard label="Total Value" value={formatCurrency(data.totals.totalValue) ?? '$0'} />
          <StatCard label="Average Value" value={formatCurrency(data.totals.avgValue) ?? '$0'} />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status Breakdown (Pie) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contracts by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {data.statusBreakdown.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.statusBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''} (${value ?? 0})`}
                    >
                      {data.statusBreakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_CHART_COLORS[entry.status] || CHART_COLORS[0]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Type Distribution (Bar) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contracts by Type</CardTitle>
            </CardHeader>
            <CardContent>
              {data.typeDistribution.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.typeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Contracts">
                      {data.typeDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Expiry Timeline (Bar) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expiry Timeline (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.expiryTimeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Expiring" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Risk Summary (Horizontal Bar) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Flags by Severity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.riskSummary.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No risk flags</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.riskSummary} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="label" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Flags">
                      {data.riskSummary.map((entry) => (
                        <Cell
                          key={entry.severity}
                          fill={RISK_CHART_COLORS[entry.severity] || CHART_COLORS[0]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Contract Value Over Time (Line) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract Value Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {data.contractValueOverTime.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No value data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.contractValueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Obligation Breakdown (Pie) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obligations by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {data.obligationBreakdown.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No obligations</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.obligationBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }: { name?: string; value?: number }) => `${name ?? ''} (${value ?? 0})`}
                    >
                      {data.obligationBreakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={OBLIGATION_CHART_COLORS[entry.status] || CHART_COLORS[0]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
