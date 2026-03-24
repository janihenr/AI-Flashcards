-- Story 2-1: Create 'avatars' Supabase Storage bucket and RLS policies.
-- Bucket is public (anonymous GET allowed); only the owning user may write.
-- Upload path convention: {userId}/avatar.{ext} with upsert=true.

-- Create the bucket (idempotent)
-- file_size_limit: 2 MB server-side enforcement (matches client-side guard)
-- allowed_mime_types: restrict to image types only; blocks SVG and other non-image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB = 2 * 1024 * 1024 bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: user can INSERT to their own folder only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users upload own avatar' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users upload own avatar"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = ''avatars''
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )';
  END IF;
END $$;

-- RLS: user can UPDATE their own avatar (USING filters rows; WITH CHECK validates new state)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users update own avatar' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users update own avatar"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = ''avatars''
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = ''avatars''
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )';
  END IF;
END $$;

-- RLS: user can DELETE their own avatar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users delete own avatar' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Users delete own avatar"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = ''avatars''
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )';
  END IF;
END $$;

-- RLS: public SELECT (avatar URLs are public)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read avatars' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''avatars'')';
  END IF;
END $$;
