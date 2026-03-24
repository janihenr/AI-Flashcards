-- Create deck-images storage bucket
-- public = true: images are served without JWT (shared decks need public image access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deck-images',
  'deck-images',
  true,
  5242880,  -- 5 MB limit enforced at storage layer
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload only to their own user-id folder
-- Path structure: {userId}/{deckId}/{filename}
CREATE POLICY "deck_images_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deck-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Public read (deck images are not secret — decks can be shared with other users)
CREATE POLICY "deck_images_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'deck-images');

-- Users may delete only their own images
CREATE POLICY "deck_images_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deck-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
