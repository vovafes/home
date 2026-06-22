-- Migration: add pg_trgm extension and GIN trigram indexes for faster ILIKE searches
-- Run this on your Supabase/Postgres database (requires permission to create extensions)

BEGIN;

-- enable trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tasks: title and description
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON public.tasks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm ON public.tasks USING gin (description gin_trgm_ops);

-- Shopping items: name and note
CREATE INDEX IF NOT EXISTS idx_shopping_name_trgm ON public.shopping_items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_shopping_note_trgm ON public.shopping_items USING gin (note gin_trgm_ops);

COMMIT;
