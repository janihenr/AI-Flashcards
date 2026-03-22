-- Story 1.4: Allow NULL presentation_mode and response_time_ms for anonymous reviews.
-- Anonymous sessions capture these values in the Zustand store but do NOT persist them
-- to the DB (GDPR legitimate interest basis — behavioral profiling begins with first auth session).
-- Authenticated reviews continue to provide both values as before.

ALTER TABLE reviews ALTER COLUMN presentation_mode DROP NOT NULL;
ALTER TABLE reviews ALTER COLUMN response_time_ms DROP NOT NULL;
