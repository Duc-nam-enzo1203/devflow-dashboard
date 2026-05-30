-- Partner progress page (/): anonymous visitors must be able to read selected projects.
-- Authenticated users still only see their own rows via existing "Users can view own projects" policy.
-- Policies on the same table are combined with OR for SELECT.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visible_on_partner_portal boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.projects.visible_on_partner_portal IS
  'When true, this project appears on the public partner progress page for visitors without login.';

DROP POLICY IF EXISTS "Anon can view partner-visible projects" ON public.projects;
CREATE POLICY "Anon can view partner-visible projects" ON public.projects
  FOR SELECT
  TO anon
  USING (visible_on_partner_portal = true);
