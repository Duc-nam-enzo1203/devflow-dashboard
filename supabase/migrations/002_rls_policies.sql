-- =============================================
-- DevFlow Dashboard - Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES: Users can only read/update their own profile
-- =============================================
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- PARTNERS: Users manage their own partners only
-- =============================================
CREATE POLICY "partners_all_own" ON public.partners
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- PROJECTS: Users manage their own projects only
-- =============================================
CREATE POLICY "projects_all_own" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TASKS: Users can manage tasks in their own projects
-- =============================================
CREATE POLICY "tasks_select_own" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "tasks_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PLAN ITEMS: Users manage their own plan items only
-- =============================================
CREATE POLICY "plan_items_all_own" ON public.plan_items
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- NOTES: Users manage their own notes only
-- =============================================
CREATE POLICY "notes_all_own" ON public.notes
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- EVENTS: Users manage their own events only
-- =============================================
CREATE POLICY "events_all_own" ON public.events
  FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- TEAM MEMBERS: Users can manage team members in their projects
-- =============================================
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id)
  );