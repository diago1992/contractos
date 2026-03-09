"use client";

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export function ActivityFeed() {
  const supabase = createClient();
  const { data: entries, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('id, action, details, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="panel">
      <div className="panel-title">Recent Activity</div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-[rgba(26,46,36,0.04)] rounded animate-pulse" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-50)' }}>No recent activity</p>
      ) : (
        <div className="act-list">
          {entries.map(entry => (
            <div key={entry.id} className="act-item">
              <div className="act-dot" />
              <span className="act-text">{entry.action}</span>
              <span className="act-time">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
