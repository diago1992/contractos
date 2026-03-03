-- ============================================================================
-- Semantic search: pgvector, contract chunks, escalation tracking
-- ============================================================================

-- Enable pgvector extension (must be enabled by Supabase dashboard for hosted)
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Contract chunks for RAG / semantic search
-- ---------------------------------------------------------------------------

CREATE TABLE contract_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  chunk_index   integer NOT NULL,
  content       text NOT NULL,
  embedding     vector(1536),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_chunks_contract ON contract_chunks (contract_id);
CREATE INDEX idx_contract_chunks_embedding ON contract_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Store raw parsed text on the contract for re-chunking
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS raw_text text;

-- RLS
ALTER TABLE contract_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_chunks_select ON contract_chunks FOR SELECT TO authenticated USING (true);
CREATE POLICY contract_chunks_insert ON contract_chunks FOR INSERT TO authenticated
  WITH CHECK (has_role_or_above(auth.uid(), 'contributor'));
CREATE POLICY contract_chunks_delete ON contract_chunks FOR DELETE TO authenticated
  USING (has_role_or_above(auth.uid(), 'admin'));

GRANT SELECT ON contract_chunks TO authenticated;
GRANT INSERT, DELETE ON contract_chunks TO authenticated;

-- ---------------------------------------------------------------------------
-- Escalation tracking for tiered renewal alerts
-- ---------------------------------------------------------------------------

CREATE TABLE escalation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id   uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tier          text NOT NULL,  -- '30d', '14d', '7d', 'overdue'
  sent_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, tier)
);

CREATE INDEX idx_escalation_log_contract ON escalation_log (contract_id);

ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY escalation_log_select ON escalation_log FOR SELECT TO authenticated USING (true);
CREATE POLICY escalation_log_insert ON escalation_log FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON escalation_log TO authenticated;

-- ---------------------------------------------------------------------------
-- Similarity search function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION match_contract_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  contract_id uuid,
  chunk_index integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cc.id,
    cc.contract_id,
    cc.chunk_index,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM contract_chunks cc
  WHERE 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;
