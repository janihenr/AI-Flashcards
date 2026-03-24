-- Story 2-1: Add avatar_url to profiles table for user profile image storage.
-- Avatar images are stored in Supabase Storage bucket 'avatars'; this column
-- holds the public URL returned by Storage after upload.

ALTER TABLE profiles ADD COLUMN avatar_url text;
