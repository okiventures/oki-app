-- ============================================================================
-- 020: bring the storage buckets into the migration pipeline
-- ============================================================================
--
-- The 'avatars' and 'kyc-documents' buckets were only ever defined in
-- backend/migrations/003_storage_buckets.sql and backend/rls-policies/
-- 002_storage_kyc.sql — two files outside supabase/migrations that nothing runs.
-- `supabase db reset` therefore produced a stack with no buckets at all, while
-- the app assumed both existed:
--
--   avatars       -> profileService.uploadAvatar()
--   kyc-documents -> kyc-upload, kyc-admin-list, kyc-admin-review
--
-- Uploads failed with a bucket-not-found until someone created them by hand in
-- the dashboard, which is also why the policies drifted from the ones the code
-- expects. This migration is a straight port of those two files so a reset is
-- sufficient; the originals are deleted in the same commit.

INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,   -- profile photos are publicly viewable
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,  -- identity documents are never public; reads go through signed urls
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public             = false,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf']::text[];

-- ---------------------------------------------------------------------------
-- avatars: public read, owner-only write
-- ---------------------------------------------------------------------------
--
-- Every policy below scopes by the first path segment, so the upload path has to
-- stay '{auth.uid()}/...'. profileService builds it that way; changing the layout
-- there without changing these lets one user overwrite another's file.

DROP POLICY IF EXISTS avatars_select_public ON storage.objects;
CREATE POLICY avatars_select_public
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- kyc-documents: private, owner writes, owner and admin read
-- ---------------------------------------------------------------------------
--
-- Path layout is '{handyman_id}/{document_type}/{uuid}.{ext}', so the same
-- first-segment check applies. There is deliberately no owner DELETE: a handyman
-- must not be able to remove a document an admin has already reviewed.

DROP POLICY IF EXISTS kyc_storage_insert_own ON storage.objects;
CREATE POLICY kyc_storage_insert_own
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS kyc_storage_select_own ON storage.objects;
CREATE POLICY kyc_storage_select_own
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS kyc_storage_select_admin ON storage.objects;
CREATE POLICY kyc_storage_select_admin
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND is_admin()
);

DROP POLICY IF EXISTS kyc_storage_delete_admin ON storage.objects;
CREATE POLICY kyc_storage_delete_admin
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND is_admin()
);
