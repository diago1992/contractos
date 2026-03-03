-- ============================================================================
-- ContractOS v2 — Vendors, Invoices, Obligation enhancements
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE vendor_sync_status AS ENUM ('not_synced','syncing','synced','error');
CREATE TYPE invoice_status AS ENUM ('open','paid_in_full','partially_paid','overdue','voided','cancelled');

-- ---------------------------------------------------------------------------
-- Vendors (vendor master with NetSuite mapping)
-- ---------------------------------------------------------------------------

CREATE TABLE vendors (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  netsuite_vendor_id  text UNIQUE,
  netsuite_entity_id  text,
  email               text,
  phone               text,
  address             text,
  tax_id              text,
  sync_status         vendor_sync_status NOT NULL DEFAULT 'not_synced',
  last_synced_at      timestamptz,
  sync_error          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendors_netsuite_vendor_id ON vendors (netsuite_vendor_id);
CREATE INDEX idx_vendors_name ON vendors USING gin (to_tsvector('english', name));

-- ---------------------------------------------------------------------------
-- Contract ↔ Vendor join (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE contract_vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  vendor_id     uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, vendor_id)
);

CREATE INDEX idx_contract_vendors_contract ON contract_vendors (contract_id);
CREATE INDEX idx_contract_vendors_vendor ON contract_vendors (vendor_id);

-- ---------------------------------------------------------------------------
-- Invoices (cached from NetSuite)
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id             uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_id           uuid REFERENCES contracts(id) ON DELETE SET NULL,
  netsuite_invoice_id   text UNIQUE,
  invoice_number        text,
  amount                numeric NOT NULL,
  amount_paid           numeric NOT NULL DEFAULT 0,
  amount_remaining      numeric NOT NULL DEFAULT 0,
  currency              text NOT NULL DEFAULT 'AUD',
  status                invoice_status NOT NULL DEFAULT 'open',
  invoice_date          date,
  due_date              date,
  netsuite_data         jsonb,
  last_synced_at        timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_vendor ON invoices (vendor_id);
CREATE INDEX idx_invoices_contract ON invoices (contract_id);
CREATE INDEX idx_invoices_netsuite_id ON invoices (netsuite_invoice_id);
CREATE INDEX idx_invoices_status ON invoices (status);

-- ---------------------------------------------------------------------------
-- Obligations enhancement
-- ---------------------------------------------------------------------------

ALTER TABLE obligations ADD COLUMN assigned_to uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_obligations_assigned_to ON obligations (assigned_to);

-- ---------------------------------------------------------------------------
-- Updated-at triggers (following existing pattern)
-- ---------------------------------------------------------------------------

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS Policies (following existing pattern)
-- ---------------------------------------------------------------------------

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Vendors: all authenticated users can read
CREATE POLICY vendors_select ON vendors FOR SELECT TO authenticated USING (true);
-- Vendors: reviewer+ can insert/update
CREATE POLICY vendors_insert ON vendors FOR INSERT TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));
CREATE POLICY vendors_update ON vendors FOR UPDATE TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'));

-- Contract-vendors: all authenticated can read
CREATE POLICY contract_vendors_select ON contract_vendors FOR SELECT TO authenticated USING (true);
-- Contract-vendors: reviewer+ can manage
CREATE POLICY contract_vendors_insert ON contract_vendors FOR INSERT TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));
CREATE POLICY contract_vendors_delete ON contract_vendors FOR DELETE TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'));

-- Invoices: all authenticated can read
CREATE POLICY invoices_select ON invoices FOR SELECT TO authenticated USING (true);
-- Invoices: reviewer+ can insert/update (sync operations)
CREATE POLICY invoices_insert ON invoices FOR INSERT TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'reviewer'));
CREATE POLICY invoices_update ON invoices FOR UPDATE TO authenticated
  USING (has_role_or_above(auth.uid(), 'reviewer'));

-- Grant table access to authenticated role
GRANT SELECT ON vendors TO authenticated;
GRANT INSERT, UPDATE ON vendors TO authenticated;
GRANT SELECT ON contract_vendors TO authenticated;
GRANT INSERT, DELETE ON contract_vendors TO authenticated;
GRANT SELECT ON invoices TO authenticated;
GRANT INSERT, UPDATE ON invoices TO authenticated;
