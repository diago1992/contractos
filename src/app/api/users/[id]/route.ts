import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/contracts';

const VALID_ROLES: UserRole[] = ['viewer', 'contributor', 'reviewer', 'admin'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;

  // Auth check
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const newRole = body.role as UserRole;

  if (!VALID_ROLES.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Get current role for audit
  const admin = createAdminClient();
  const { data: targetUser } = await admin
    .from('users')
    .select('role, email')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const previousRole = targetUser.role;

  // Update role
  const { error: updateError } = await admin
    .from('users')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit log
  await admin.from('audit_log').insert({
    user_id: user.id,
    action: 'role_change',
    details: {
      target_user_id: targetUserId,
      target_email: targetUser.email,
      previous_role: previousRole,
      new_role: newRole,
    },
  });

  return NextResponse.json({ success: true });
}
