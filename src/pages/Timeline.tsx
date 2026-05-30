import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { cn } from '../lib/utils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Clock,
} from 'lucide-react';

import { useProjects } from '../context/ProjectsContext';
import { translateStatus, translateType } from '../lib/projectLabels';

const TIMELINE_STATUS_FILTERS: { value: string; tkey: string }[] = [
  { value: 'All', tkey: 'filter_all' },
  { value: 'Planning', tkey: 'planning' },
  { value: 'In Progress', tkey: 'status_in_progress' },
  { value: 'Review', tkey: 'status_review' },
  { value: 'Completed', tkey: 'status_completed' },
];

export default function Timeline() {
  const { t } = useSettings();
  const { projects } = useProjects();
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());

  const filteredProjects = projects.filter(p =>
    statusFilter === 'All' || p.status === statusFilter
  );

  const toggleProject = (id: string) => {
    setHiddenProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleProjects = filteredProjects.filter(p => !hiddenProjects.has(p.id));

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('project_timeline')}</h1>
          <p className="text-slate-500 mt-1">{t('timeline_subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2.5 bg-white border border-slate-100 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors",
                showFilters && "border-accent-primary text-accent-primary bg-accent-light/20"
              )}
            >
              <Filter size={18} />
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 space-y-3"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('filter_by_status')}</p>
                  <div className="space-y-1">
                    {TIMELINE_STATUS_FILTERS.map(({ value: status, tkey }) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setShowFilters(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          statusFilter === status ? "bg-accent-light text-accent-primary" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {t(tkey)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center bg-white border border-slate-100 rounded-xl overflow-hidden">
            <button className="p-2.5 hover:bg-slate-50 text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 py-2 text-sm font-bold text-slate-700 border-x border-slate-100">
              {t('timeline_demo_period')}
            </div>
            <button className="p-2.5 hover:bg-slate-50 text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Timeline Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-12 border-b border-slate-100 bg-slate-50/50">
          <div className="col-span-5 p-4 font-bold text-slate-400 text-xs uppercase tracking-wider">
            {t('projects')}
          </div>
          <div className="col-span-1 p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider">
            {t('col_type')}
          </div>
          <div className="col-span-2 p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider">
            {t('status')}
          </div>
          <div className="col-span-3 p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider">
            {t('progress_label')}
          </div>
          <div className="col-span-1 p-4 text-center font-bold text-slate-400 text-xs uppercase tracking-wider">
          </div>
        </div>

        {/* Project rows */}
        <div className="divide-y divide-slate-50">
          {visibleProjects.map((project) => (
            <div
              key={project.id}
              className="grid grid-cols-12 items-center group hover:bg-slate-50/30 transition-colors"
            >
              {/* Project name + client */}
              <div className="col-span-5 p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{project.name}</h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{project.client}</p>
                  </div>
                </div>
              </div>

              {/* Type badge */}
              <div className="col-span-1 p-4 text-center">
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                  project.type === 'Freelance' ? "bg-accent-light text-accent-primary" : "bg-slate-100 text-slate-600"
                )}>
                  {translateType(project.type, t)}
                </span>
              </div>

              {/* Status */}
              <div className="col-span-2 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    project.status === 'Completed' ? 'bg-emerald-500' :
                    project.status === 'Planning' ? 'bg-amber-500' :
                    project.status === 'In Progress' ? 'bg-indigo-500' :
                    project.status === 'Review' ? 'bg-violet-500' :
                    'bg-slate-400'
                  )} />
                  <span className="text-xs font-medium text-slate-600">{translateStatus(project.status, t)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="col-span-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        project.progress === 100 ? "bg-emerald-500" : "bg-accent-primary"
                      )}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 min-w-[36px]">{project.progress}%</span>
                </div>
              </div>

              {/* 3-dot toggle button */}
              <div className="col-span-1 p-4 text-center">
                <button
                  onClick={() => toggleProject(project.id)}
                  className="p-1.5 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-slate-100"
                  title={t('timeline_hide_project')}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Hidden projects indicator */}
          {hiddenProjects.size > 0 && (
            <div className="px-6 py-3 bg-slate-50/50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {hiddenProjects.size === 1
                  ? t('timeline_hidden_single')
                  : t('timeline_hidden_plural').replace('{{count}}', String(hiddenProjects.size))}
              </p>
              <button
                onClick={() => setHiddenProjects(new Set())}
                className="text-xs font-bold text-accent-primary hover:underline"
              >
                {t('show_all')}
              </button>
            </div>
          )}

          {visibleProjects.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-400">{t('no_projects_found')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('timeline_avg_duration')}</p>
            <h3 className="text-xl font-bold text-slate-900">{t('timeline_avg_days')}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CalendarIcon size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('timeline_on_schedule')}</p>
            <h3 className="text-xl font-bold text-slate-900">85%</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
            <Filter size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('timeline_critical_path')}</p>
            <h3 className="text-xl font-bold text-slate-900">
              {t('timeline_stat_projects').replace('{{count}}', String(visibleProjects.length))}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}