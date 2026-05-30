-- =============================================
-- Supabase Storage - Project Files Bucket
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'project-files',
  'project-files',
  true,
  10485760 -- 10MB
)
ON CONFLICT (id) DO NOTHING;

-- Public can read uploaded project files via public URL.
DROP POLICY IF EXISTS "project_files_public_read" ON storage.objects;
CREATE POLICY "project_files_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-files');

-- Logged-in users upload under their own namespace: <uid>/<projectId>/<filename>
DROP POLICY IF EXISTS "project_files_owner_upload" ON storage.objects;
CREATE POLICY "project_files_owner_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "project_files_owner_update" ON storage.objects;
CREATE POLICY "project_files_owner_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "project_files_owner_delete" ON storage.objects;
CREATE POLICY "project_files_owner_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
