"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, UserRole } from '@/types/contracts';

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to fetch users' }));
        throw new Error(data.error || 'Failed to fetch users');
      }
      return res.json();
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update role' }));
        throw new Error(data.error || 'Failed to update role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
