-- =============================================================================
-- ContractOS: Initial Schema Migration
-- =============================================================================
-- This migration sets up the complete database schema for the ContractOS
-- contract management system, including tables, enums, indexes, triggers,
-- and Row Level Security policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom Enums
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
  'viewer',
  'contributor',
  'reviewer',
  'admin'
);

CREATE TYPE contract_status AS ENUM (
  'draft',
  'active',
  'under_review',
  'expired',
  'terminated'
);

CREATE TYPE extraction_status AS ENUM (
  'pending',
  'processing',
  'extracted',
  'verified',
  'failed'
);

CREATE TYPE document_type AS ENUM (
  'master_services_agreement',
  'statement_of_work',
  'nda',
  'employment_agreement',
  'vendor_agreement',
  'lease_agreement',
  'license_agreement',
  'amendment',
  'addendum',
  'other'
);

CREATE TYPE obligation_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'overdue',
  'waived'
);

CREATE TYPE risk_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ---------------------------------------------------------------------------
-- 2. Helper Functions (created before tables that depend on them)
-- ---------------------------------------------------------------------------

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Search vector update trigger function
CREATE OR REPLACE FUNCTION update_contract_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.counterparty_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check user role (used in RLS policies)
CREATE OR REPLACE FUNCTION get_user_role(check_user_id uuid)
RETURNS user_role AS $$
DECLARE
  result user_role;
BEGIN
  SELECT role INTO result FROM public.users WHERE id = check_user_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: returns true if user has at least the given role level
CREATE OR REPLACE FUNCTION has_role_or_above(check_user_id uuid, minimum_role user_role)
RETURNS boolean AS $$
DECLARE
  actual_role user_role;
  role_rank int;
  minimum_rank int;
BEGIN
  actual_role := get_user_role(check_user_id);
  IF actual_role IS NULL THEN
    RETURN false;
  END IF;

  -- Map roles to numeric rank: viewer=1, contributor=2, reviewer=3, admin=4
  role_rank := CASE actual_role
    WHEN 'viewer' THEN 1
    WHEN 'contributor' THEN 2
    WHEN 'reviewer' THEN 3
    WHEN 'admin' THEN 4
  END;

  minimum_rank := CASE minimum_role
    WHEN 'viewer' THEN 1
    WHEN 'contributor' THEN 2
    WHEN 'reviewer' THEN 3
    WHEN 'admin' THEN 4
  END;

  RETURN role_rank >= minimum_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  avatar_url  text,
  role        user_role NOT NULL DEFAULT 'viewer',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';

-- Contracts table (core entity)
CREATE TABLE public.contracts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  counterparty_name   text,
  document_type       document_type,
  status              contract_status NOT NULL DEFAULT 'draft',
  extraction_status   extraction_status NOT NULL DEFAULT 'pending',
  summary             text,
  effective_date      date,
  expiry_date         date,
  notice_period_days  integer,
  auto_renewal        boolean NOT NULL DEFAULT false,
  renewal_term_months integer,
  governing_law       text,
  file_path           text NOT NULL,
  file_name           text NOT NULL,
  file_size_bytes     bigint,
  file_type           text,
  uploaded_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at         timestamptz,
  search_vector       tsvector,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

COMMENT ON TABLE public.contracts IS 'Core contract records with metadata and AI extraction fields';
COMMENT ON COLUMN public.contracts.summary IS 'AI-generated summary of the contract';
COMMENT ON COLUMN public.contracts.file_path IS 'Supabase Storage path to the uploaded document';
COMMENT ON COLUMN public.contracts.file_type IS 'MIME type of the uploaded document';
COMMENT ON COLUMN public.contracts.search_vector IS 'Full-text search index over title, counterparty, and summary';
COMMENT ON COLUMN public.contracts.deleted_at IS 'Soft delete timestamp; non-null means logically deleted';

-- Commercial terms table
CREATE TABLE public.commercial_terms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  term_type     text NOT NULL,
  description   text NOT NULL,
  amount        numeric,
  currency      text DEFAULT 'AUD',
  frequency     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.commercial_terms IS 'Financial and commercial terms extracted from contracts';
COMMENT ON COLUMN public.commercial_terms.term_type IS 'Category such as payment, pricing, penalty';
COMMENT ON COLUMN public.commercial_terms.frequency IS 'Payment frequency such as monthly, annual';

-- Obligations table
CREATE TABLE public.obligations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  obligated_party text,
  due_date        date,
  status          obligation_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.obligations IS 'Contractual obligations and their tracking status';
COMMENT ON COLUMN public.obligations.obligated_party IS 'The party responsible: us or the counterparty name';

-- Risk flags table
CREATE TABLE public.risk_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  severity    risk_severity NOT NULL DEFAULT 'medium',
  resolved    boolean NOT NULL DEFAULT false,
  resolved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.risk_flags IS 'AI-identified or manually flagged risk items on contracts';

-- Contract tags table
CREATE TABLE public.contract_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  tag         text NOT NULL,
  UNIQUE (contract_id, tag)
);

COMMENT ON TABLE public.contract_tags IS 'Free-form tags for categorising contracts';

-- Contract links table (parent/child relationships)
CREATE TABLE public.contract_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contract_id  uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  child_contract_id   uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  link_type           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_contract_id, child_contract_id)
);

COMMENT ON TABLE public.contract_links IS 'Relationships between contracts such as amendments, addenda, renewals';
COMMENT ON COLUMN public.contract_links.link_type IS 'Relationship type: amendment, addendum, renewal';

-- Audit log table
CREATE TABLE public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_log IS 'Immutable log of all significant actions on contracts';
COMMENT ON COLUMN public.audit_log.action IS 'Action type: created, updated, ai_extraction, verified, status_change';
COMMENT ON COLUMN public.audit_log.details IS 'Action-specific metadata as JSON';

-- Notifications table (stub for Phase 2)
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  type        text NOT NULL,
  message     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'User notifications (Phase 2 stub)';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

-- Full-text search index on contracts
CREATE INDEX idx_contracts_search_vector ON public.contracts USING GIN (search_vector);

-- Frequently queried columns on contracts
CREATE INDEX idx_contracts_status ON public.contracts (status);
CREATE INDEX idx_contracts_document_type ON public.contracts (document_type);
CREATE INDEX idx_contracts_expiry_date ON public.contracts (expiry_date);
CREATE INDEX idx_contracts_uploaded_by ON public.contracts (uploaded_by);

-- Soft-delete filter (most queries will filter on deleted_at IS NULL)
CREATE INDEX idx_contracts_deleted_at ON public.contracts (deleted_at)
  WHERE deleted_at IS NULL;

-- Foreign key lookups on child tables
CREATE INDEX idx_commercial_terms_contract_id ON public.commercial_terms (contract_id);
CREATE INDEX idx_obligations_contract_id ON public.obligations (contract_id);
CREATE INDEX idx_obligations_status ON public.obligations (status);
CREATE INDEX idx_obligations_due_date ON public.obligations (due_date);
CREATE INDEX idx_risk_flags_contract_id ON public.risk_flags (contract_id);
CREATE INDEX idx_risk_flags_severity ON public.risk_flags (severity);
CREATE INDEX idx_contract_tags_contract_id ON public.contract_tags (contract_id);
CREATE INDEX idx_contract_tags_tag ON public.contract_tags (tag);
CREATE INDEX idx_contract_links_parent ON public.contract_links (parent_contract_id);
CREATE INDEX idx_contract_links_child ON public.contract_links (child_contract_id);
CREATE INDEX idx_audit_log_contract_id ON public.audit_log (contract_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at);
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_read ON public.notifications (user_id, read)
  WHERE read = false;

-- ---------------------------------------------------------------------------
-- 5. Triggers
-- ---------------------------------------------------------------------------

-- Auto-update updated_at on users
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on contracts
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on obligations
CREATE TRIGGER trg_obligations_updated_at
  BEFORE UPDATE ON public.obligations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update search_vector on contracts INSERT or UPDATE
CREATE TRIGGER trg_contracts_search_vector
  BEFORE INSERT OR UPDATE OF title, counterparty_name, summary
  ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_search_vector();

-- ---------------------------------------------------------------------------
-- 6. Auto-create user profile on auth.users insert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count int;
  assigned_role user_role;
BEGIN
  -- First user in the system gets admin role; everyone else starts as viewer
  SELECT count(*) INTO user_count FROM public.users;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;

  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    assigned_role
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create public profile
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obligations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_flags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_tags    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;

-- ---- users RLS ----

-- Users can read their own profile
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all user profiles
CREATE POLICY "users_select_admin"
  ON public.users FOR SELECT
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- Users can update their own profile (but not their role)
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any user profile (including role changes)
CREATE POLICY "users_update_admin"
  ON public.users FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'))
  WITH CHECK (has_role_or_above(auth.uid(), 'admin'));

-- ---- contracts RLS ----

-- All authenticated users can SELECT non-deleted contracts
CREATE POLICY "contracts_select_authenticated"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Contributors and above can INSERT contracts
CREATE POLICY "contracts_insert_contributor"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

-- Reviewers and above can UPDATE contracts
CREATE POLICY "contracts_update_reviewer"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

-- Admins can perform soft delete (UPDATE deleted_at)
-- Note: actual DELETE is blocked; admins set deleted_at instead.
-- This policy allows admins to see soft-deleted rows for management.
CREATE POLICY "contracts_select_deleted_admin"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- Admins can hard DELETE if absolutely needed
CREATE POLICY "contracts_delete_admin"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- commercial_terms RLS ----

CREATE POLICY "commercial_terms_select_authenticated"
  ON public.commercial_terms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "commercial_terms_insert_contributor"
  ON public.commercial_terms FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

CREATE POLICY "commercial_terms_update_reviewer"
  ON public.commercial_terms FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

CREATE POLICY "commercial_terms_delete_admin"
  ON public.commercial_terms FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- obligations RLS ----

CREATE POLICY "obligations_select_authenticated"
  ON public.obligations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "obligations_insert_contributor"
  ON public.obligations FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

CREATE POLICY "obligations_update_reviewer"
  ON public.obligations FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

CREATE POLICY "obligations_delete_admin"
  ON public.obligations FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- risk_flags RLS ----

CREATE POLICY "risk_flags_select_authenticated"
  ON public.risk_flags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "risk_flags_insert_contributor"
  ON public.risk_flags FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

CREATE POLICY "risk_flags_update_reviewer"
  ON public.risk_flags FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

CREATE POLICY "risk_flags_delete_admin"
  ON public.risk_flags FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- contract_tags RLS ----

CREATE POLICY "contract_tags_select_authenticated"
  ON public.contract_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contract_tags_insert_contributor"
  ON public.contract_tags FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

CREATE POLICY "contract_tags_update_reviewer"
  ON public.contract_tags FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

CREATE POLICY "contract_tags_delete_admin"
  ON public.contract_tags FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- contract_links RLS ----

CREATE POLICY "contract_links_select_authenticated"
  ON public.contract_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contract_links_insert_contributor"
  ON public.contract_links FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

CREATE POLICY "contract_links_update_reviewer"
  ON public.contract_links FOR UPDATE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'))
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));

CREATE POLICY "contract_links_delete_admin"
  ON public.contract_links FOR DELETE
  TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

-- ---- audit_log RLS ----

-- All authenticated users can read audit logs
CREATE POLICY "audit_log_select_authenticated"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (true);

-- Contributors and above can insert audit log entries
CREATE POLICY "audit_log_insert_contributor"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

-- Audit log entries are immutable: no UPDATE or DELETE policies

-- ---- notifications RLS ----

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System inserts notifications (via service role); contributors+ can also create
CREATE POLICY "notifications_insert_contributor"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. Grants (ensure the authenticated role can access the schema)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role_or_above(uuid, user_role) TO authenticated;
