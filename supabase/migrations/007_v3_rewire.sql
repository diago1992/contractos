-- ============================================================================
-- ContractOS v3 Rewire Migration
-- Counterparty-centric redesign: expanded vendors, contracts, obligations,
-- invoices columns + discussions table
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ALTER vendors — add 25 columns for identity, financial, contact, address,
-- bank, AI, and ESG data
-- ---------------------------------------------------------------------------

-- Identity
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trading_name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS abn text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_registered boolean DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS logo_url text;

-- Financial
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AUD';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_gl_code text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_tax_code text;

-- Primary contact
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_title text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_phone text;

-- Address (split from existing single `address` field)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Australia';

-- Bank AU
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_bsb text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_verified boolean DEFAULT false;

-- Bank International
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_swift text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_iban text;

-- AI
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ai_description text;

-- ESG (JSONB for flexible AI-generated data)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS esg_data jsonb DEFAULT '{}';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS esg_summary text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS esg_updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- ALTER contracts — add 5 columns for cost centre, value, owner, filing
-- ---------------------------------------------------------------------------

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cost_centre text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS annual_value numeric;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS mm_owner text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS on_file boolean DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notice_deadline date;

-- ---------------------------------------------------------------------------
-- ALTER obligations — add risk level and category
-- ---------------------------------------------------------------------------

ALTER TABLE obligations ADD COLUMN IF NOT EXISTS risk text CHECK (risk IN ('High','Medium','Low'));
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('payment','notice','compliance','reporting','operational','legal'));

-- ---------------------------------------------------------------------------
-- ALTER invoices — add date_paid
-- ---------------------------------------------------------------------------

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date_paid timestamptz;

-- ---------------------------------------------------------------------------
-- CREATE discussions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (contract_id IS NOT NULL OR vendor_id IS NOT NULL)
);

-- Indexes for discussions
CREATE INDEX IF NOT EXISTS idx_discussions_contract_id ON discussions(contract_id);
CREATE INDEX IF NOT EXISTS idx_discussions_vendor_id ON discussions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_discussions_user_id ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON discussions(created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS for discussions
-- ---------------------------------------------------------------------------

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read discussions
CREATE POLICY "Authenticated users can read discussions"
  ON discussions FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own discussions
CREATE POLICY "Users can insert own discussions"
  ON discussions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own discussions
CREATE POLICY "Users can update own discussions"
  ON discussions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own discussions
CREATE POLICY "Users can delete own discussions"
  ON discussions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Indexes on new contract columns for filtering
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_contracts_cost_centre ON contracts(cost_centre);
CREATE INDEX IF NOT EXISTS idx_contracts_mm_owner ON contracts(mm_owner);
CREATE INDEX IF NOT EXISTS idx_contracts_on_file ON contracts(on_file);
CREATE INDEX IF NOT EXISTS idx_contracts_notice_deadline ON contracts(notice_deadline);

-- ---------------------------------------------------------------------------
-- GRANT permissions for discussions table
-- (New tables created after the initial blanket GRANT need explicit GRANTs)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON discussions TO authenticated;

-- ---------------------------------------------------------------------------
-- updated_at trigger for discussions
-- (Reuse existing trigger function from initial schema)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Add NOT NULL to columns with DEFAULT values that TS types as non-nullable
-- (Safe: existing rows already have DEFAULT values from the ALTER)
-- ---------------------------------------------------------------------------

ALTER TABLE vendors ALTER COLUMN gst_registered SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN currency SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN address_country SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN bank_verified SET NOT NULL;
ALTER TABLE vendors ALTER COLUMN esg_data SET NOT NULL;
ALTER TABLE contracts ALTER COLUMN on_file SET NOT NULL;
