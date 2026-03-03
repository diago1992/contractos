-- =============================================================================
-- ContractOS: Storage Bucket Setup
-- =============================================================================
-- Creates the "contracts" storage bucket and sets up access policies.
-- =============================================================================

-- Create the contracts storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload files to the contracts bucket
CREATE POLICY "contracts_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contracts');

-- Policy: Authenticated users can read files from the contracts bucket
CREATE POLICY "contracts_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contracts');

-- Policy: Admins can delete files from the contracts bucket
CREATE POLICY "contracts_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND has_role_or_above(auth.uid(), 'admin')
  );
