-- Store note category as plain text so values always persist (enum rejected unknown labels).
ALTER TABLE public.notes
  ALTER COLUMN category DROP DEFAULT;

ALTER TABLE public.notes
  ALTER COLUMN category TYPE text USING (category::text);

ALTER TABLE public.notes
  ALTER COLUMN category SET DEFAULT 'General';

DROP TYPE IF EXISTS public.note_category;
