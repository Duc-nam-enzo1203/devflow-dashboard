-- =============================================
-- Notification Preferences
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_desktop BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notify_mobile BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notify_marketing BOOLEAN DEFAULT FALSE;
