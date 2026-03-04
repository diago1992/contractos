'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/contracts';

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? '',
    role: (profile?.role as UserRole) ?? 'viewer',
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes — role rarely changes
    gcTime: 30 * 60 * 1000, // keep in cache 30 minutes
  });
}
