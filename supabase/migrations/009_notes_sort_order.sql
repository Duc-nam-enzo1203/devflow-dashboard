-- Manual order for personal notes (drag-and-drop in UI)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE public.notes n
SET sort_order = s.row_num
FROM (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY is_pinned DESC NULLS LAST, updated_at DESC NULLS LAST
    )::integer AS row_num
  FROM public.notes
) s
WHERE n.id = s.id;
