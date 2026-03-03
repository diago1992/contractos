import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface CalendarContract {
  id: string;
  title: string;
  counterparty_name: string | null;
  status: string;
  expiry_date: string;
  auto_renewal: boolean;
}

export function useCalendarContracts(year: number, month: number) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['calendar-contracts', year, month],
    queryFn: async () => {
      // Fetch contracts with expiry dates in a 3-month window around the viewed month
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month + 2, 0);

      const { data, error } = await supabase
        .from('contracts')
        .select('id, title, counterparty_name, status, expiry_date, auto_renewal')
        .gte('expiry_date', start.toISOString().split('T')[0])
        .lte('expiry_date', end.toISOString().split('T')[0])
        .in('status', ['active', 'under_review', 'expired'])
        .is('deleted_at', null)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data as CalendarContract[];
    },
  });
}
