-- Ensure the browser (anon key, no login) can read projects for the public partner page.
-- 1) Table must be selectable by anon role (RLS still applies on top).
-- 2) Policy allows any row for SELECT when using the anon role (single-tenant dashboards).
--    For stricter control, replace USING (true) with (visible_on_partner_portal = true).

GRANT SELECT ON TABLE public.projects TO anon;

DROP POLICY IF EXISTS "Anon can view partner-visible projects" ON public.projects;
CREATE POLICY "Anon can view partner-visible projects" ON public.projects
  FOR SELECT
  TO anon
  USING (true);
