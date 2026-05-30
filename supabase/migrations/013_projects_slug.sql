-- Per-user unique slug for friendly URLs (/app/projects/suzuki)

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS slug TEXT;

WITH raw AS (
  SELECT
    id,
    user_id,
    trim(both '-' FROM lower(regexp_replace(coalesce(nullif(trim(name), ''), 'project'), '[^a-zA-Z0-9]+', '-', 'g'))) AS base_raw,
    created_at
  FROM public.projects
),
norm AS (
  SELECT
    id,
    user_id,
    CASE WHEN base_raw = '' OR base_raw IS NULL THEN 'project' ELSE base_raw END AS base_slug,
    created_at
  FROM raw
),
numbered AS (
  SELECT
    id,
    user_id,
    base_slug,
    row_number() OVER (PARTITION BY user_id, base_slug ORDER BY created_at) AS rn
  FROM norm
)
UPDATE public.projects p
SET slug = CASE
  WHEN n.rn = 1 THEN n.base_slug
  ELSE n.base_slug || '-' || n.rn::text
END
FROM numbered n
WHERE p.id = n.id
  AND (p.slug IS NULL OR trim(p.slug) = '');

UPDATE public.projects
SET slug = 'project-' || left(replace(id::text, '-', ''), 12)
WHERE slug IS NULL OR trim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS projects_user_id_slug_key ON public.projects (user_id, slug);

ALTER TABLE public.projects ALTER COLUMN slug SET NOT NULL;
