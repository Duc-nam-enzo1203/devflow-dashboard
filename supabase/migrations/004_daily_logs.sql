-- =============================================
-- Daily Logs Table
-- =============================================
CREATE TYPE log_status AS ENUM ('Planning', 'In Progress', 'Done', 'Blocked');

CREATE TABLE public.daily_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL DEFAULT '',
  accomplishments TEXT[] DEFAULT '{}',
  blockers TEXT DEFAULT '',
  mood VARCHAR(20) DEFAULT 'neutral', -- happy, productive, neutral, tired, stressed
  hours_logged DECIMAL(4,1) DEFAULT 0,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX idx_daily_logs_user_id ON public.daily_logs(user_id);
CREATE INDEX idx_daily_logs_date ON public.daily_logs(log_date);

CREATE TRIGGER update_daily_logs_updated_at
  BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_logs_all_own" ON public.daily_logs
  FOR ALL USING (auth.uid() = user_id);
