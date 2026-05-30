-- P0 Security: Row Level Security (RLS) Policies
-- Every table must enforce that users can only access their own data

-- =============================================
-- PROFILES — only owner can read/write their profile
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- =============================================
-- PROJECTS — only owner can CRUD their projects
-- =============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- =============================================
-- PARTNERS — only owner can CRUD their partners
-- =============================================
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own partners" ON public.partners;
CREATE POLICY "Users can view own partners" ON public.partners
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own partners" ON public.partners;
CREATE POLICY "Users can insert own partners" ON public.partners
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can update own partners" ON public.partners;
CREATE POLICY "Users can update own partners" ON public.partners
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own partners" ON public.partners;
CREATE POLICY "Users can delete own partners" ON public.partners
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- =============================================
-- TASKS — only owner can CRUD their tasks
-- =============================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- =============================================
-- PLAN_ITEMS — only owner can CRUD
-- =============================================
ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own plan items" ON public.plan_items;
CREATE POLICY "Users can view own plan items" ON public.plan_items
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own plan items" ON public.plan_items;
CREATE POLICY "Users can insert own plan items" ON public.plan_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can update own plan items" ON public.plan_items;
CREATE POLICY "Users can update own plan items" ON public.plan_items
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own plan items" ON public.plan_items;
CREATE POLICY "Users can delete own plan items" ON public.plan_items
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- =============================================
-- NOTES — only owner can CRUD
-- =============================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (
    auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (
    auth.uid() = user_id
  );