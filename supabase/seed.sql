-- System user for cold start deck (FR1)
-- Run ONCE during initial setup. SYSTEM_USER_ID must match the generated UUID.
-- CRITICAL: Never delete this user from Supabase Auth — cold start breaks silently if deleted.
-- After running: copy the UUID from auth.users and set as SYSTEM_USER_ID env var.

INSERT INTO auth.users (
  id,
  email,
  role,
  aud,
  created_at,
  updated_at,
  is_super_admin,
  encrypted_password
) VALUES (
  gen_random_uuid(),                        -- COPY THIS UUID → set as SYSTEM_USER_ID env var
  'system@internal.flashcards.app',
  'authenticated',
  'authenticated',
  now(),
  now(),
  false,
  '!'                                       -- locked account — '!' sentinel prevents all password auth
)
ON CONFLICT (email) DO NOTHING;

-- Insert matching profiles row (ON CONFLICT DO NOTHING for idempotency)
INSERT INTO profiles (id, display_name, tier, is_admin)
SELECT id, 'System', 'free', false
FROM auth.users WHERE email = 'system@internal.flashcards.app'
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Cold Start Deck: "5 Science-Backed Memory Techniques"
-- Story 1.4 — APPEND after system user section above.
-- Uses fixed UUIDs for idempotency — ON CONFLICT DO NOTHING prevents duplicates.
-- Deck owned by system user (user_id = system user profile ID).
-- Cards: 2 qa, 2 image, 2 context-narrative, 4 qa = 10 total
-- =============================================================================

-- Deck
INSERT INTO decks (id, title, user_id, created_at)
SELECT
  '00000000-0000-4000-a000-000000000001'::uuid,
  '5 Science-Backed Memory Techniques',
  au.id,
  now()
FROM auth.users au WHERE au.email = 'system@internal.flashcards.app'
ON CONFLICT (id) DO NOTHING;

-- Notes (one per card concept; deck_id = cold start deck, user_id = system user)
INSERT INTO notes (id, deck_id, user_id, content, created_at)
SELECT
  n.note_id::uuid,
  '00000000-0000-4000-a000-000000000001'::uuid,
  au.id,
  n.content,
  now()
FROM auth.users au,
(VALUES
  ('00000000-0000-4000-b000-000000000001', 'Spaced Repetition: review at increasing intervals'),
  ('00000000-0000-4000-b000-000000000002', 'Active Recall: retrieve from memory without hints'),
  ('00000000-0000-4000-b000-000000000003', 'Elaborative Interrogation: ask why facts are true'),
  ('00000000-0000-4000-b000-000000000004', 'The Forgetting Curve: Ebbinghaus memory decay'),
  ('00000000-0000-4000-b000-000000000005', 'Interleaving: mixing topics during study sessions'),
  ('00000000-0000-4000-b000-000000000006', 'Retrieval Practice: testing yourself to strengthen memory'),
  ('00000000-0000-4000-b000-000000000007', 'The Testing Effect: tests improve long-term retention'),
  ('00000000-0000-4000-b000-000000000008', 'Spaced vs Massed Practice: distributed beats cramming'),
  ('00000000-0000-4000-b000-000000000009', 'Elaborative Interrogation applied: connect new to known'),
  ('00000000-0000-4000-b000-000000000010', 'Interleaving in practice: switch subjects every 20 min')
) AS n(note_id, content)
WHERE au.email = 'system@internal.flashcards.app'
ON CONFLICT (id) DO NOTHING;

-- Cards (10 total: 6 qa, 2 image, 2 context-narrative)
-- Each card references its note via note_id; user_id = system user
INSERT INTO cards (id, note_id, user_id, mode, front_content, back_content, narrative_context, image_url, created_at)
SELECT
  c.card_id::uuid,
  c.note_id::uuid,
  au.id,
  c.mode::card_mode,
  c.front_content,
  c.back_content,
  c.narrative_context,
  c.image_url,
  now()
FROM auth.users au,
(VALUES
  -- qa cards (1, 2, 7, 8, 9, 10)
  ('00000000-0000-4000-c000-000000000001',
   '00000000-0000-4000-b000-000000000001',
   'qa',
   'What is spaced repetition?',
   'A learning technique that schedules reviews at increasing intervals, leveraging the spacing effect to move information into long-term memory.',
   NULL, NULL),

  ('00000000-0000-4000-c000-000000000002',
   '00000000-0000-4000-b000-000000000002',
   'qa',
   'What is active recall?',
   'The practice of actively retrieving information from memory (e.g., flashcards, practice tests) rather than passively re-reading — dramatically improves retention.',
   NULL, NULL),

  -- image cards (3, 4)
  ('00000000-0000-4000-c000-000000000003',
   '00000000-0000-4000-b000-000000000003',
   'image',
   'Elaborative Interrogation diagram',
   'Ask "Why is this true?" to connect new facts to existing knowledge, creating stronger memory traces.',
   NULL,
   'https://placehold.co/600x400?text=Elaborative+Interrogation'),

  ('00000000-0000-4000-c000-000000000004',
   '00000000-0000-4000-b000-000000000004',
   'image',
   'Ebbinghaus Forgetting Curve',
   'Without review, we forget ~70% of new information within 24 hours. Spaced repetition flattens this curve.',
   NULL,
   'https://placehold.co/600x400?text=Forgetting+Curve'),

  -- context-narrative cards (5, 6)
  ('00000000-0000-4000-c000-000000000005',
   '00000000-0000-4000-b000-000000000005',
   'context-narrative',
   'What studying strategy did Maria use to ace her exams?',
   'Maria used interleaving — mixing math, history, and language in each session rather than blocking subjects. Her test scores improved significantly.',
   'Maria has three exams next week. Instead of studying one subject all day, she rotates through all three every 30 minutes during each study session.',
   NULL),

  ('00000000-0000-4000-c000-000000000006',
   '00000000-0000-4000-b000-000000000006',
   'context-narrative',
   'Why did Tom close his notes after reading each chapter?',
   'Tom practiced retrieval: by closing his notes and writing down everything he remembered, he strengthened memory pathways far more than re-reading.',
   'Tom reads a chapter of his textbook. Instead of highlighting or re-reading, he closes the book and writes down everything he can recall.',
   NULL),

  -- more qa cards (7–10)
  ('00000000-0000-4000-c000-000000000007',
   '00000000-0000-4000-b000-000000000007',
   'qa',
   'What is the Testing Effect?',
   'Taking tests on material improves long-term retention more than re-studying the same material — even if the tests are difficult and you make errors.',
   NULL, NULL),

  ('00000000-0000-4000-c000-000000000008',
   '00000000-0000-4000-b000-000000000008',
   'qa',
   'Why is spaced practice better than cramming?',
   'Distributed practice forces the brain to reconstruct memories each session, strengthening retrieval pathways. Cramming creates short-term retention that fades quickly.',
   NULL, NULL),

  ('00000000-0000-4000-c000-000000000009',
   '00000000-0000-4000-b000-000000000009',
   'qa',
   'How do you apply elaborative interrogation when learning a new fact?',
   'Ask "Why is this true?" and "How does this connect to what I already know?" — generating explanations creates richer, more retrievable memory traces.',
   NULL, NULL),

  ('00000000-0000-4000-c000-000000000010',
   '00000000-0000-4000-b000-000000000010',
   'qa',
   'What is interleaving and why does it feel harder than blocking?',
   'Interleaving mixes different topics/skills in a session. It feels harder because the brain cannot rely on short-term context — but this difficulty is desirable and produces stronger learning.',
   NULL, NULL)
) AS c(card_id, note_id, mode, front_content, back_content, narrative_context, image_url)
WHERE au.email = 'system@internal.flashcards.app'
ON CONFLICT (id) DO NOTHING;
