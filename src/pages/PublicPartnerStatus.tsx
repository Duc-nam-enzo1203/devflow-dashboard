import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Code2,
  LogIn,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { appPath } from '../lib/routes';
import { cn, formatMoney } from '../lib/utils';
import { translatePayment, translateStatus, translateType } from '../lib/projectLabels';
import type { PaymentStatus, Project } from '../types';

function paymentBadgeClass(ps: PaymentStatus) {
  if (ps === 'Paid') return 'bg-emerald-100 text-emerald-800';
  if (ps === 'Partial') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function taskDoneSummary(project: Project, t: (k: string) => string) {
  const tasks = project.tasks || [];
  const total = tasks.length;
  const done = tasks.filter((x) => x.status === 'Done').length;
  if (total === 0) return t('not_applicable');
  return t('partner_tasks_done')
    .replace('{{done}}', String(done))
    .replace('{{total}}', String(total));
}

export default function PublicPartnerStatus() {
  const { projects, isLoading, error } = useProjects();
  const { t, language, setLanguage } = useSettings();
  const { user, profile, logout, isAuthenticated, isLoading: authLoading } = useAuth();

  const displayName = profile?.name || user?.name || '';
  const avatarUrl = profile?.avatar || user?.avatar;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const sorted = [...projects].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-white shadow-lg shadow-accent-primary/25">
              <Code2 size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{t('partner_portal_title')}</h1>
              <p className="truncate text-xs text-slate-500 sm:text-sm">{t('partner_portal_subtitle')}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={cn(
                  'rounded-lg px-2.5 py-1 transition-colors',
                  language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('vi')}
                className={cn(
                  'rounded-lg px-2.5 py-1 transition-colors',
                  language === 'vi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                )}
              >
                VI
              </button>
            </div>
            {authLoading ? (
              <div className="flex h-10 w-24 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
                <Link
                  to={appPath('/')}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-3 py-2 text-sm font-semibold text-white shadow-md shadow-accent-primary/25 transition-all hover:opacity-90 sm:px-4 sm:py-2.5"
                >
                  <LayoutDashboard size={18} />
                  <span className="hidden sm:inline">{t('dashboard')}</span>
                </Link>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-sm">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-light text-xs font-bold text-accent-primary ring-1 ring-accent-primary/15">
                      {initials}
                    </div>
                  )}
                  <span className="max-w-[100px] truncate text-sm font-semibold text-slate-800 sm:max-w-[160px]">
                    {displayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
                  title={t('logout')}
                >
                  <LogOut size={18} />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-accent-primary/40 hover:bg-accent-light/30"
              >
                <LogIn size={18} className="text-accent-primary" />
                {t('partner_login_cta')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-accent-primary" />
            <p className="text-sm font-medium">{t('partner_loading')}</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{t('partner_load_error')}</p>
              <p className="mt-1 text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !error && sorted.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center text-slate-500">
            {t('partner_no_projects')}
          </p>
        )}

        {!isLoading && !error && sorted.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-1">
            {sorted.map((project, i) => (
              <motion.li
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 px-5 py-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">{project.name}</h2>
                    {project.client ? (
                      <p className="mt-0.5 text-sm text-slate-500">{project.client}</p>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-slate-400">
                      {translateType(project.type, t)} · {translateStatus(project.status, t)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                        paymentBadgeClass(project.paymentStatus)
                      )}
                    >
                      {translatePayment(project.paymentStatus, t)}
                    </span>
                    {project.amount > 0 ? (
                      <span className="text-sm font-semibold text-slate-700">
                        {formatMoney(project.amount, language)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                      <span>{t('progress_label')}</span>
                      <span className="text-slate-600">{project.progress}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-accent-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>
                        {t('due_date')}: {project.deadline || t('not_applicable')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-slate-400" />
                      <span>{taskDoneSummary(project, t)}</span>
                    </div>
                  </div>
                  <div className="pt-1">
                    <Link
                      to={`/project/${project.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-accent-primary/40 hover:bg-accent-light/30"
                    >
                      {language === 'vi' ? 'Xem chi tiết dự án' : 'View project details'}
                    </Link>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </main>

      <footer className="border-t border-slate-200/80 py-6 text-center text-[11px] text-slate-400">
        {t('app_name')} · {t('partner_portal_footer')}
      </footer>
    </div>
  );
}
