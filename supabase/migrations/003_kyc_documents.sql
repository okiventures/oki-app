-- 003_kyc_documents.sql
-- KYC document storage for handyman identity verification

CREATE TYPE kyc_document_type AS ENUM ('GOVERNMENT_ID', 'SELFIE', 'PROOF_OF_ADDRESS');

CREATE TABLE kyc_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handyman_id      UUID NOT NULL REFERENCES handymen (id) ON DELETE CASCADE,
  document_type    kyc_document_type NOT NULL,
  file_path        TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  file_size        INTEGER NOT NULL,
  mime_type        TEXT NOT NULL,
  status           kyc_status NOT NULL DEFAULT 'PENDING',
  reviewed_by      UUID REFERENCES users (id),
  rejection_reason TEXT,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_kyc_file_size CHECK (file_size > 0 AND file_size <= 5242880),
  CONSTRAINT chk_kyc_mime_type CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'application/pdf')
  )
);

CREATE INDEX idx_kyc_documents_handyman ON kyc_documents (handyman_id, document_type);
CREATE INDEX idx_kyc_documents_status ON kyc_documents (status) WHERE status = 'PENDING';

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY kyc_documents_select_own ON kyc_documents
  FOR SELECT TO authenticated
  USING (handyman_id = (SELECT auth.uid()) OR (SELECT is_admin()));

CREATE POLICY kyc_documents_insert_own ON kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    handyman_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND user_type = 'handyman')
  );

CREATE POLICY kyc_documents_admin_update ON kyc_documents
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY kyc_documents_admin_delete ON kyc_documents
  FOR DELETE TO authenticated
  USING (is_admin());

CREATE TRIGGER trg_kyc_documents_updated_at
  BEFORE UPDATE ON kyc_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
