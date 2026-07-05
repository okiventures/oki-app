-- 002_storage_kyc.sql
-- Supabase Storage bucket configuration + RLS for KYC documents
-- Run after creating 'kyc-documents' bucket in Supabase dashboard or via SQL

-- Create the private bucket (file_size_limit in bytes: 5 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- Handymen upload to their own folder: {handyman_id}/{document_type}/{uuid}.{ext}
CREATE POLICY "kyc_storage_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Handymen can read their own documents
CREATE POLICY "kyc_storage_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can read and delete all KYC documents
CREATE POLICY "kyc_storage_select_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND is_admin()
);

CREATE POLICY "kyc_storage_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND is_admin()
);
