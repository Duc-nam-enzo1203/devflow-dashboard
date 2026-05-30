-- Add dedicated logo field for projects.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.projects.logo_url IS
  'Project logo URL. Dedicated field, independent from custom_fields.';
