-- =============================================================================
-- Security Hardening Migration
-- =============================================================================
-- 1. Prevent non-admin users from self-escalating their role
-- 2. Add DELETE policy for escalation_log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Replace users_update_own policy to prevent role self-modification
-- ---------------------------------------------------------------------------
-- A trigger is more reliable than RLS WITH CHECK for column-level restrictions.

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role column is being changed, verify the caller is an admin
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT has_role_or_above(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_self_escalation();

-- ---------------------------------------------------------------------------
-- 2. escalation_log DELETE policy (service role only — no user deletes)
-- ---------------------------------------------------------------------------
-- The escalation_log should only be cleared by service-role operations
-- (e.g., the Renew action clears escalation log via admin client).
-- No authenticated user should be able to delete escalation_log rows directly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'escalation_log_delete_none' AND tablename = 'escalation_log'
  ) THEN
    EXECUTE 'CREATE POLICY "escalation_log_delete_none" ON public.escalation_log FOR DELETE TO authenticated USING (false)';
  END IF;
END $$;
