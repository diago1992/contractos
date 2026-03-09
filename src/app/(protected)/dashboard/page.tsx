"use client";

import { AppLayout } from '@/components/layout/app-layout';
import { StatCards } from '@/components/dashboard/stat-cards';
import { RenewalsTable } from '@/components/dashboard/renewals-table';
import { ObligationsPanel } from '@/components/dashboard/obligations-panel';
import { SpendAlerts } from '@/components/dashboard/spend-alerts';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { MissingContracts } from '@/components/dashboard/missing-contracts';
import { useDashboardStats, useAllContracts } from '@/hooks/use-contracts';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Obligation } from '@/types/contracts';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: contracts, isLoading: contractsLoading } = useAllContracts();

  const supabase = createClient();
  const { data: obligations, isLoading: obligationsLoading } = useQuery({
    queryKey: ['all-obligations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Obligation[];
    },
  });

  return (
    <AppLayout title="Dashboard">
      {/* Stat cards */}
      <StatCards stats={stats} isLoading={statsLoading} />

      {/* Row 1: Renewals + Obligations/Spend */}
      <div className="dash-row two-col">
        <RenewalsTable contracts={contracts ?? []} isLoading={contractsLoading} />
        <div>
          <ObligationsPanel obligations={obligations ?? []} isLoading={obligationsLoading} />
          <SpendAlerts contracts={contracts ?? []} isLoading={contractsLoading} />
        </div>
      </div>

      {/* Row 2: Missing contracts + Activity */}
      <div className="dash-row equal">
        <MissingContracts contracts={contracts ?? []} isLoading={contractsLoading} />
        <ActivityFeed />
      </div>
    </AppLayout>
  );
}
