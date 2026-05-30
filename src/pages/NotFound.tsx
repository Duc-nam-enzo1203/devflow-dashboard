import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, LayoutDashboard, FileQuestion } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { appPath } from '../lib/routes';

export default function NotFound() {
  const { t } = useSettings();
  const { pathname } = useLocation();
  const inAppShell = pathname.startsWith('/app');

  return (
    <div
      className={
        inAppShell
          ? 'flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center'
          : 'flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-16 text-center'
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
          <FileQuestion size={40} strokeWidth={1.5} />
        </div>
        <p className="text-6xl font-black tracking-tight text-slate-200">404</p>
        <h1 className="-mt-2 text-2xl font-bold text-slate-900">{t('not_found_title')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{t('not_found_description')}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-accent-primary/30 hover:bg-accent-light/20"
          >
            <Home size={18} className="text-accent-primary" />
            {t('not_found_back_home')}
          </Link>
          <Link
            to={appPath('/')}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition-all hover:opacity-90"
          >
            <LayoutDashboard size={18} />
            {t('not_found_open_app')}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
