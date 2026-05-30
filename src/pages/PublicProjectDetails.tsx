import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Circle,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '../context/SettingsContext';
import { mapDBProject, supabase } from '../lib/supabase';
import { cn, formatMoney } from '../lib/utils';
import { translatePayment, translateStatus, translateType } from '../lib/projectLabels';
import type { DBProject } from '../lib/supabase';
import type { Project } from '../types';

function paymentBadgeClass(paymentStatus: Project['paymentStatus']) {
  if (paymentStatus === 'Paid') return 'bg-emerald-100 text-emerald-800';
  if (paymentStatus === 'Partial') return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function taskSummary(project: Project, t: (key: string) => string) {
  const tasks = project.tasks || [];
  const total = tasks.length;
  const done = tasks.filter((x) => x.status === 'Done').length;
  if (total === 0) return t('not_applicable');
  return t('partner_tasks_done')
    .replace('{{done}}', String(done))
    .replace('{{total}}', String(total));
}

export default function PublicProjectDetails() {
  const { id } = useParams();
  const { t, language } = useSettings();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function run() {
      if (!id) {
        setError('Invalid project id');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        if (!data) {
          setProject(null);
          return;
        }
        setProject(mapDBProject(data as DBProject));
      } catch (e) {
        if (!isMounted) return;
        setError(e instanceof Error ? e.message : 'Failed to load project');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void run();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const tasks = useMemo(() => project?.tasks || [], [project]);
  const doneCount = tasks.filter((x) => x.status === 'Done').length;
  const logoUrl = useMemo(() => {
    if (!project) return '';
    if (project.logoUrl) return project.logoUrl;
    const imageFile = (project.files || []).find((f) => /^image\//i.test(f.type) && f.url)?.url;
    return imageFile || '';
  }, [project]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 text-slate-900">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-accent-primary/40 hover:bg-accent-light/30"
          >
            <ChevronLeft size={16} />
            {language === 'vi' ? 'Quay lại danh sách dự án' : 'Back to projects'}
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
            {t('partner_loading')}
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">{t('partner_load_error')}</p>
              <p className="mt-1 text-sm opacity-90">{error}</p>
            </div>
          </div>
        ) : null}

        {!isLoading && !error && !project ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center text-slate-500">
            {language === 'vi' ? 'Dự án không tồn tại hoặc không được chia sẻ.' : 'Project not found or not shared.'}
          </p>
        ) : null}

        {!isLoading && !error && project ? (
          <motion.article
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  {project.client ? <p className="mt-1 text-slate-500">{project.client}</p> : null}
                  <p className="mt-2 text-xs font-medium text-slate-400">
                    {translateType(project.type, t)} · {translateStatus(project.status, t)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                      paymentBadgeClass(project.paymentStatus)
                    )}
                  >
                    {translatePayment(project.paymentStatus, t)}
                  </span>
                  <p className="mt-2 text-lg font-bold text-slate-800">{formatMoney(project.amount, language)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 px-6 py-5">
              <section>
                <div className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>{t('progress_label')}</span>
                  <span className="text-slate-600">{project.progress}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-accent-primary transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                  />
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Calendar size={14} />
                    {t('due_date')}
                  </div>
                  <p className="font-semibold text-slate-800">{project.deadline || t('not_applicable')}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <CheckCircle2 size={14} />
                    {language === 'vi' ? 'Tiến độ công việc' : 'Task progress'}
                  </div>
                  <p className="font-semibold text-slate-800">{taskSummary(project, t)}</p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  {language === 'vi' ? 'Logo dự án' : 'Project logo'}
                </h3>
                <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={project.name}
                      className="h-16 w-16 rounded-xl border border-slate-200 bg-white object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">
                      {logoUrl
                        ? language === 'vi'
                          ? 'Logo đã được thiết lập'
                          : 'Logo configured'
                        : language === 'vi'
                          ? 'Chưa có logo dự án'
                          : 'No project logo yet'}
                    </p>
                    {logoUrl ? (
                      <a
                        href={logoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent-primary hover:underline"
                      >
                        <LinkIcon size={12} />
                        {language === 'vi' ? 'Mở logo' : 'Open logo'}
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>

              {(project.demoLink || project.liveLink) && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {language === 'vi' ? 'Liên kết dự án' : 'Project links'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.demoLink ? (
                      <a
                        href={project.demoLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Demo <ExternalLink size={14} />
                      </a>
                    ) : null}
                    {project.liveLink ? (
                      <a
                        href={project.liveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Live <ExternalLink size={14} />
                      </a>
                    ) : null}
                  </div>
                </section>
              )}

              {Array.isArray(project.customFields) && project.customFields.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {language === 'vi' ? 'Thông tin bổ sung' : 'Additional details'}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {project.customFields.map((field, idx) => (
                      <div
                        key={`${field.label}-${idx}`}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {field.label || (language === 'vi' ? 'Trường tùy chỉnh' : 'Custom field')}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                          {field.value || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {tasks.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {language === 'vi' ? 'Danh sách công việc' : 'Task list'}
                  </h3>
                  <ul className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                    {tasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          {task.status === 'Done' ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : (
                            <Circle size={16} className="text-slate-400" />
                          )}
                          <span className={cn('text-sm', task.status === 'Done' && 'text-slate-500 line-through')}>
                            {task.title}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{task.priority}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">
                    {language === 'vi'
                      ? `Đã hoàn thành ${doneCount}/${tasks.length} công việc.`
                      : `${doneCount}/${tasks.length} tasks completed.`}
                  </p>
                </section>
              )}
            </div>
          </motion.article>
        ) : null}
      </main>
    </div>
  );
}
