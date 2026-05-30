import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  Target,
  Settings,
  LogOut,
  Code2,
  Clock,
  Trello,
  StickyNote,
  PenLine,
  X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { APP_BASE, appPath } from '../lib/routes';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useSettings();

  const closeIfMobile = () => onClose?.();

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: APP_BASE },
    { icon: Briefcase, label: t('projects'), path: appPath('/projects') },
    { icon: Trello, label: t('kanban'), path: appPath('/kanban') },
    { icon: Clock, label: t('timeline'), path: appPath('/timeline') },
    { icon: Users, label: t('team'), path: appPath('/team') },
    { icon: Calendar, label: t('calendar'), path: appPath('/calendar') },
    { icon: Target, label: t('planning'), path: appPath('/planning') },
    { icon: StickyNote, label: t('notes'), path: appPath('/notes') },
    { icon: PenLine, label: t('daily_log') || 'Daily Log', path: appPath('/daily-log') },
  ];

  const handleLogout = () => {
    onClose?.();
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900',
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-out',
        'lg:static lg:z-auto lg:h-full lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-white shadow-lg shadow-accent-primary/20">
            <Code2 size={24} />
          </div>
          <span className="truncate text-lg font-bold tracking-tight text-white sm:text-xl">{t('app_name')}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2 sm:px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === APP_BASE}
            onClick={closeIfMobile}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-slate-800 text-accent-primary font-medium"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              )
            }
          >
            <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-800 p-4">
        <NavLink
          to={appPath('/settings')}
          onClick={closeIfMobile}
          className={({ isActive }) =>
            cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
              isActive
                ? "bg-slate-800 text-accent-primary font-medium"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            )
          }
        >
          <Settings size={20} className="group-hover:rotate-45 transition-transform" />
          <span>{t('settings')}</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>{t('logout')}</span>
        </button>
      </div>

      <div className="hidden shrink-0 p-4 sm:p-6 lg:block">
        <div className="group relative overflow-hidden rounded-2xl bg-slate-800 p-4 text-white">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-accent-primary/20 rounded-full blur-2xl group-hover:bg-accent-primary/40 transition-all" />
          <p className="text-xs text-slate-400 mb-1">{t('current_plan')}</p>
          <p className="text-sm font-semibold mb-3">{t('pro_developer')}</p>
          <div className="w-full bg-slate-700 h-1.5 rounded-full mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '80%' }}
              className="bg-accent-primary h-full rounded-full"
            />
          </div>
          <p className="text-[10px] text-slate-400">80% {t('monthly_goal')}</p>
        </div>
      </div>
    </aside>
  );
}
