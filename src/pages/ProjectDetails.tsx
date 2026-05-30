import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  Wallet,
  Users,
  Clock,
  CheckCircle2,
  ExternalLink, 
  Globe, 
  Database,
  Plus,
  MessageSquare,
  Paperclip,
  X,
  Trash2,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  Upload,
  Save
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { cn, formatMoney, formInputToVnd, progressRangeStyle, vndToFormInput } from '@/src/lib/utils';
import { appPath } from '../lib/routes';
import { isUuidParam } from '../lib/slug';
import { supabase } from '../lib/supabase';
import { translatePayment, translateStatus, translateType } from '../lib/projectLabels';
import { Project, Task, ProjectStatus, ProjectType, PaymentStatus, CustomField } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

function translateProjectStatus(status: string | undefined, t: (key: string) => string): string {
  if (!status) return '';
  const keyMap: Record<string, string> = {
    Planning: 'planning',
    'In Progress': 'status_in_progress',
    Review: 'status_review',
    Completed: 'status_completed',
    Maintenance: 'status_maintenance',
    'On Hold': 'status_on_hold',
    Cancelled: 'status_cancelled',
  };
  const k = keyMap[status];
  return k ? t(k) : status;
}

/** Parse task.date YYYY-MM-DD as local midnight. */
function parseTaskDateYmd(dateStr: string | undefined): Date | null {
  if (!dateStr?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Monday 00:00 local of the ISO-style week containing `ref` (week = Mon–Sun). */
function startOfWeekMonday(ref: Date): Date {
  const c = new Date(ref);
  const dow = c.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  c.setDate(c.getDate() + offset);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfWeekSunday(weekMonday: Date): Date {
  const e = new Date(weekMonday);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

/** Count Done tasks with a due date in [weekMonday..weekSunday], bucketed Mon=0 … Sun=6. */
function doneTasksByWeekdayInRange(tasks: Task[] | undefined, weekMonday: Date, weekSunday: Date): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  if (!tasks?.length) return counts;
  for (const task of tasks) {
    if (task.status !== 'Done') continue;
    const td = parseTaskDateYmd(task.date);
    if (!td || td < weekMonday || td > weekSunday) continue;
    const sun0 = td.getDay();
    const mon0 = sun0 === 0 ? 6 : sun0 - 1;
    counts[mon0] += 1;
  }
  return counts;
}

export default function ProjectDetails() {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const { t, language } = useSettings();
  const { 
    projects, 
    partners, 
    updateProject, 
    deleteProject,
    addTask,
    toggleTask,
    deleteTask,
    addMember,
    removeMember,
    addFile,
    deleteFile
  } = useProjects();
  const { user } = useAuth();
  
  const project = useMemo(() => {
    if (!slugParam || !(projects ?? []).length) return undefined;
    const p = slugParam.trim();
    if (isUuidParam(p)) {
      return (projects ?? []).find((x) => x.id.toLowerCase() === p.toLowerCase());
    }
    const lower = p.toLowerCase();
    return (projects ?? []).find((x) => x.slug.toLowerCase() === lower);
  }, [projects, slugParam]);
  const partner = (partners ?? []).find((p) => p?.id === project?.partnerId);
  const serverCustomFieldsSig = useMemo(
    () =>
      project
        ? JSON.stringify(
            (project.customFields ?? []).map((f) => ({
              label: f.label ?? '',
              value: f.value ?? '',
            }))
          )
        : '',
    [project?.id, project?.customFields]
  );
  const serverResourcesSig = useMemo(
    () => (project ? JSON.stringify(project.resources ?? []) : ''),
    [project?.id, project?.resources]
  );
  const projectLogoUrl = useMemo(() => {
    if (!project) return '';
    if (project.logoUrl) return project.logoUrl;
    return (project.files || []).find((f) => /^image\//i.test(f.type) && f.url)?.url || '';
  }, [project]);

  // Modals state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  /** Trường chính trên trang chỉnh sửa dự án (đồng bộ với `project` khi đổi dự án). */
  const [quickDraft, setQuickDraft] = useState<{
    name: string;
    type: ProjectType;
    status: ProjectStatus;
    amount: number;
    progress: number;
    paymentStatus: PaymentStatus;
    deadline: string;
  }>({
    name: '',
    type: 'Freelance',
    status: 'Planning',
    amount: 0,
    progress: 0,
    paymentStatus: 'Unpaid',
    deadline: '',
  });
  const [customFieldsDraft, setCustomFieldsDraft] = useState<CustomField[]>([]);
  const [linksDraft, setLinksDraft] = useState({
    demoLink: '',
    liveLink: '',
    hostingInfo: '',
  });
  const [resourcesDraft, setResourcesDraft] = useState<string[]>([]);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isUploadingProjectFiles, setIsUploadingProjectFiles] = useState(false);
  const [projectFilesError, setProjectFilesError] = useState('');
  const [isAddProjectFileModalOpen, setIsAddProjectFileModalOpen] = useState(false);
  const [projectFileDisplayName, setProjectFileDisplayName] = useState('');
  const [pendingProjectFile, setPendingProjectFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectEditFormRef = useRef<HTMLFormElement>(null);

  const chartWeekData = useMemo(() => {
    const labels = [
      t('pd_weekday_mon'),
      t('pd_weekday_tue'),
      t('pd_weekday_wed'),
      t('pd_weekday_thu'),
      t('pd_weekday_fri'),
      t('pd_weekday_sat'),
      t('pd_weekday_sun'),
    ];
    const now = new Date();
    const wkStart = startOfWeekMonday(now);
    const wkEnd = endOfWeekSunday(wkStart);
    const counts = doneTasksByWeekdayInRange(project?.tasks, wkStart, wkEnd);
    return labels.map((name, i) => ({ name, tasks: counts[i] }));
  }, [project?.id, project?.tasks, t, language]);

  const weekChartYMax = useMemo(
    () => Math.max(5, ...chartWeekData.map((d) => d.tasks)),
    [chartWeekData]
  );

  useEffect(() => {
    if (!project) return;
    setQuickDraft({
      name: project.name,
      type: project.type ?? 'Freelance',
      status: project.status ?? 'Planning',
      amount: project.amount ?? 0,
      progress: project.progress ?? 0,
      paymentStatus: project.paymentStatus ?? 'Unpaid',
      deadline: project.deadline || '',
    });
  }, [
    project?.id,
    project?.name,
    project?.type,
    project?.status,
    project?.amount,
    project?.progress,
    project?.paymentStatus,
    project?.deadline,
  ]);

  useEffect(() => {
    if (!project) return;
    setCustomFieldsDraft(
      (project.customFields ?? []).map((f) => ({
        label: f.label ?? '',
        value: f.value ?? '',
      }))
    );
  }, [project?.id, serverCustomFieldsSig]);

  useEffect(() => {
    if (!project) return;
    setLinksDraft({
      demoLink: project.demoLink ?? '',
      liveLink: project.liveLink ?? '',
      hostingInfo: project.hostingInfo ?? '',
    });
    setResourcesDraft([...(project.resources ?? [])]);
  }, [
    project?.id,
    project?.demoLink,
    project?.liveLink,
    project?.hostingInfo,
    serverResourcesSig,
  ]);

  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">{t('pd_project_not_found')}</h2>
        <button
          type="button"
          onClick={() => navigate(appPath('/projects'))}
          className="rounded-xl bg-accent-primary px-6 py-2 font-bold text-white"
        >
          {t('pd_back_to_projects')}
        </button>
      </div>
    );
  }

  const handleDeleteProject = async () => {
    if (!window.confirm(t('delete_project_confirm').replace('{{name}}', project.name))) return;
    await deleteProject(project.id);
    navigate(appPath('/projects'));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      status: 'Todo',
      priority: newTaskPriority,
      date: new Date().toISOString().split('T')[0]
    };
    
    addTask(project.id, task);
    setNewTaskTitle('');
    setIsAddTaskModalOpen(false);
  };

  const openAddProjectFileModal = () => {
    setProjectFileDisplayName('');
    setPendingProjectFile(null);
    setProjectFilesError('');
    setIsAddProjectFileModalOpen(true);
  };

  const closeAddProjectFileModal = () => {
    setIsAddProjectFileModalOpen(false);
    setPendingProjectFile(null);
    setProjectFileDisplayName('');
    setProjectFilesError('');
  };

  const handleSubmitAddProjectFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingProjectFile) {
      setProjectFilesError(language === 'vi' ? 'Vui lòng chọn tệp.' : 'Please choose a file.');
      return;
    }

    setIsUploadingProjectFiles(true);
    setProjectFilesError('');
    try {
      await addFile(project.id, pendingProjectFile, projectFileDisplayName.trim());
      closeAddProjectFileModal();
    } catch (err) {
      console.error(err);
      const raw = err instanceof Error ? err.message : '';
      let msg =
        raw ||
        (language === 'vi' ? 'Không thể tải tệp lên.' : 'Could not upload file.');
      if (raw === 'File too large (max 10MB)') {
        msg = language === 'vi' ? 'Tệp quá lớn (tối đa 10MB).' : raw;
      }
      if (raw === 'Not authenticated') {
        msg = language === 'vi' ? 'Bạn cần đăng nhập.' : raw;
      }
      setProjectFilesError(msg);
    } finally {
      setIsUploadingProjectFiles(false);
    }
  };

  const handleAddMember = (partnerId: string) => {
    if (!partnerId) return;
    addMember(project.id, partnerId);
    setIsAddMemberModalOpen(false);
  };

  const handleUploadLogo = async (file: File | null) => {
    if (!file || !project) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadError(language === 'vi' ? 'Vui lòng chọn tệp ảnh.' : 'Please select an image file.');
      return;
    }
    if (!user?.id) {
      setLogoUploadError(language === 'vi' ? 'Bạn cần đăng nhập để tải logo.' : 'Please sign in to upload logo.');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError('');
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'png';
      const objectPath = `${user.id}/${project.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('project-files')
        .upload(objectPath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage.from('project-files').getPublicUrl(objectPath);
      const logoUrl = publicData.publicUrl;

      const nextFiles = [
        ...(project.files || []),
        {
          id: crypto.randomUUID(),
          name: file.name,
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          type: file.type || 'image/*',
          url: logoUrl,
        },
      ];

      await updateProject(project.id, {
        logoUrl,
        files: nextFiles,
      });
    } catch (e) {
      setLogoUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleQuickSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsQuickSaving(true);
    try {
      const customFields = customFieldsDraft
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
        .filter((f) => f.label || f.value);

      await updateProject(project.id, {
        name: quickDraft.name.trim() || project.name,
        type: quickDraft.type,
        status: quickDraft.status,
        amount: quickDraft.amount,
        progress: quickDraft.progress,
        paymentStatus: quickDraft.paymentStatus,
        deadline: quickDraft.deadline,
        demoLink: linksDraft.demoLink.trim(),
        liveLink: linksDraft.liveLink.trim(),
        hostingInfo: linksDraft.hostingInfo.trim(),
        resources: resourcesDraft.map((s) => s.trim()).filter(Boolean),
        customFields,
      });
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
      setSaveSuccessVisible(true);
      saveSuccessTimerRef.current = setTimeout(() => {
        setSaveSuccessVisible(false);
        saveSuccessTimerRef.current = null;
      }, 3500);
    } catch (err) {
      console.error(err);
      alert(language === 'vi' ? 'Không thể lưu thay đổi.' : 'Could not save changes.');
    } finally {
      setIsQuickSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {saveSuccessVisible ? (
          <motion.div
            key="pd-save-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-8 left-1/2 z-50 flex max-w-[min(90vw,20rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-900/10"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" aria-hidden />
            {t('pd_save_success')}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(appPath('/projects'))}
            className="rounded-xl border border-slate-100 bg-white p-2.5 text-slate-400 transition-all hover:text-slate-600 hover:shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{quickDraft.name || project.name}</h1>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                quickDraft.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : 
                quickDraft.status === 'In Progress' ? "bg-accent-light text-accent-primary" : "bg-amber-50 text-amber-600"
              )}>
                {translateProjectStatus(quickDraft.status, t)}
              </span>
            </div>
            <p className="mt-1 text-slate-500">
              {t('pd_created_line')
                .replace('{{client}}', project.client)
                .replace(
                  '{{date}}',
                  new Date(project.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')
                )}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{t('pd_edit_header_hint')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void handleDeleteProject()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-50"
          >
            <Trash2 size={18} />
            {t('delete_project')}
          </button>
          <button
            type="button"
            onClick={() => projectEditFormRef.current?.requestSubmit()}
            disabled={isQuickSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-6 py-2.5 font-bold text-white shadow-lg shadow-accent-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isQuickSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {t('save_changes')}
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            {t('pd_section_detail_edit')}
          </h2>
          <p className="max-w-xl text-right text-xs text-slate-500">{t('pd_section_detail_edit_hint')}</p>
        </div>
        <form
          ref={projectEditFormRef}
          onSubmit={handleQuickSave}
          className="space-y-6"
        >
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('pd_logo_section')}
            </h3>
            <div className="flex items-center gap-4">
              {projectLogoUrl ? (
                <img
                  src={projectLogoUrl}
                  alt={project.name}
                  className="h-16 w-16 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <ImageIcon size={20} />
                </div>
              )}
              <div className="text-sm text-slate-600">
                {projectLogoUrl ? t('pd_logo_showing') : t('pd_logo_none')}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label
                htmlFor="project-logo-upload"
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  isUploadingLogo
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-accent-primary/40 hover:bg-accent-light/30'
                )}
              >
                {isUploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {t('pd_logo_upload')}
              </label>
              <input
                id="project-logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingLogo}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  void handleUploadLogo(f);
                  e.currentTarget.value = '';
                }}
              />
              <span className="text-xs text-slate-500">{t('pd_logo_hint')}</span>
            </div>
            {logoUploadError ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">{logoUploadError}</p>
            ) : null}
          </div>

          <div className="border-t border-slate-100 pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('project_name')}
                </label>
                <input
                  required
                  type="text"
                  value={quickDraft.name}
                  onChange={(e) => setQuickDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t(language === 'en' ? 'amount_usd' : 'amount_vnd')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {language === 'en' ? '$' : '₫'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={language === 'en' ? 'any' : '1'}
                    value={vndToFormInput(quickDraft.amount, language)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = raw === '' ? 0 : parseFloat(raw);
                      setQuickDraft((d) => ({
                        ...d,
                        amount: formInputToVnd(Number.isNaN(v) ? 0 : v, language),
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-9 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('project_type')}
                </label>
                <select
                  value={quickDraft.type}
                  onChange={(e) =>
                    setQuickDraft((d) => ({ ...d, type: e.target.value as ProjectType }))
                  }
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                >
                  <option value="Freelance">{translateType('Freelance', t)}</option>
                  <option value="Corporate">{translateType('Corporate', t)}</option>
                  <option value="Internal">{translateType('Internal', t)}</option>
                  <option value="Personal">{translateType('Personal', t)}</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('status')}
                </label>
                <select
                  value={quickDraft.status}
                  onChange={(e) =>
                    setQuickDraft((d) => ({ ...d, status: e.target.value as ProjectStatus }))
                  }
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                >
                  <option value="Planning">{translateStatus('Planning', t)}</option>
                  <option value="In Progress">{translateStatus('In Progress', t)}</option>
                  <option value="Review">{translateStatus('Review', t)}</option>
                  <option value="Completed">{translateStatus('Completed', t)}</option>
                  <option value="Maintenance">{translateStatus('Maintenance', t)}</option>
                  <option value="On Hold">{translateStatus('On Hold', t)}</option>
                  <option value="Cancelled">{translateStatus('Cancelled', t)}</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('progress_percent')}
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={quickDraft.progress}
                  onChange={(e) => {
                    const progress = Number(e.target.value);
                    setQuickDraft((d) => ({
                      ...d,
                      progress,
                      ...(progress === 100 ? { status: 'Completed' as ProjectStatus } : {}),
                    }));
                  }}
                  style={progressRangeStyle(quickDraft.progress)}
                  className="range-track-fill mt-2 h-2 w-full cursor-pointer"
                />
                <p className="text-right text-[10px] font-bold text-accent-primary">{quickDraft.progress}%</p>
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('payment_status')}
                </label>
                <select
                  value={quickDraft.paymentStatus}
                  onChange={(e) =>
                    setQuickDraft((d) => ({
                      ...d,
                      paymentStatus: e.target.value as PaymentStatus,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                >
                  <option value="Unpaid">{translatePayment('Unpaid', t)}</option>
                  <option value="Partial">{translatePayment('Partial', t)}</option>
                  <option value="Paid">{translatePayment('Paid', t)}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('due_date')}
                </label>
                <input
                  type="date"
                  value={quickDraft.deadline}
                  onChange={(e) => setQuickDraft((d) => ({ ...d, deadline: e.target.value }))}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                />
              </div>
            </div>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Wallet size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pd_stat_budget')}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">
                {formatMoney(quickDraft.amount, language)}
              </h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('progress_label')}</p>
              <h3 className="text-xl font-bold text-slate-900 mt-1">{quickDraft.progress}%</h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <Clock size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pd_stat_deadline')}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                {quickDraft.deadline
                  ? (() => {
                      const d = new Date(quickDraft.deadline);
                      return Number.isNaN(d.getTime())
                        ? t('not_applicable')
                        : d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US');
                    })()
                  : t('not_applicable')}
              </h3>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pd_stat_team')}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                {t('pd_members').replace('{{count}}', String(partner ? 2 : 1))}
              </h3>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900">{t('pd_weekly_activity')}</h3>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-accent-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pd_tasks_completed')}</span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartWeekData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis
                    domain={[0, weekChartYMax]}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }} 
                  />
                  <Bar 
                    dataKey="tasks" 
                    fill="var(--accent-primary-hex, #4f46e5)" 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t('pd_recent_tasks')}</h3>
              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-accent-primary hover:underline"
              >
                <Plus size={14} /> {t('add_task')}
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {(project.tasks || []).length > 0 ? (project.tasks || []).map((task) => (
                <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => toggleTask(project.id, task.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        task.status === 'Done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 group-hover:border-accent-primary"
                      )}
                    >
                      {task.status === 'Done' && <CheckCircle2 size={12} />}
                    </button>
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        task.status === 'Done' ? "text-slate-400 line-through" : "text-slate-700"
                      )}>{task.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{task.date}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          task.priority === 'High' ? "text-rose-500" : 
                          task.priority === 'Medium' ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {task.priority === 'High'
                            ? t('high')
                            : task.priority === 'Medium'
                              ? t('medium')
                              : t('low')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTask(project.id, task.id)}
                    className="p-2 text-slate-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-400">{t('pd_no_tasks')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Team */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-900">{t('pd_project_team')}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-light rounded-xl flex items-center justify-center text-accent-primary font-bold">
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                    : t('pd_me').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{user?.name || t('pd_me')}</p>
                  <p className="text-xs text-slate-500">{user?.role || t('pd_you_role')}</p>
                </div>
              </div>
              {partner ? (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <img 
                      src={partner.avatar} 
                      alt={partner.name} 
                      className="w-10 h-10 rounded-xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">{partner.name}</p>
                      <p className="text-xs text-slate-500">{partner.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(project.id, partner.id)}
                    className="p-2 text-slate-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
                    aria-label={t('pd_remove_member_aria')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-100 py-2.5 text-xs font-bold text-slate-400 transition-all hover:border-accent-primary/30 hover:text-accent-primary"
                >
                  <Plus size={14} /> {t('team_add_member')}
                </button>
              )}
            </div>
          </div>

          {/* Resources & Links (editable; save with header Save) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">{t('resources_label')}</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('demo_link')}
                </label>
                <div className="relative">
                  <Globe
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="url"
                    value={linksDraft.demoLink}
                    onChange={(e) => setLinksDraft((d) => ({ ...d, demoLink: e.target.value }))}
                    placeholder={t('ph_demo_url')}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                  {linksDraft.demoLink.trim() ? (
                    <a
                      href={linksDraft.demoLink.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-accent-primary"
                      aria-label={t('demo_link')}
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('pd_live_website')}
                </label>
                <div className="relative">
                  <ExternalLink
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="url"
                    value={linksDraft.liveLink}
                    onChange={(e) => setLinksDraft((d) => ({ ...d, liveLink: e.target.value }))}
                    placeholder={t('ph_live_url')}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                  {linksDraft.liveLink.trim() ? (
                    <a
                      href={linksDraft.liveLink.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-emerald-600"
                      aria-label={t('pd_live_website')}
                    >
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('hosting_info')}
                </label>
                <div className="relative">
                  <Database
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={linksDraft.hostingInfo}
                    onChange={(e) => setLinksDraft((d) => ({ ...d, hostingInfo: e.target.value }))}
                    placeholder={t('ph_hosting')}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('pd_resource_tags')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setResourcesDraft((rows) => [...rows, ''])}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-primary hover:underline"
                  >
                    <Plus size={12} /> {t('pd_add_resource_tag')}
                  </button>
                </div>
                <div className="space-y-2">
                  {resourcesDraft.map((tag, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) =>
                          setResourcesDraft((rows) => {
                            const next = [...rows];
                            next[idx] = e.target.value;
                            return next;
                          })
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() => setResourcesDraft((rows) => rows.filter((_, i) => i !== idx))}
                        className="shrink-0 rounded-xl p-2 text-rose-500 transition-colors hover:bg-rose-50"
                        aria-label={language === 'vi' ? 'Xóa thẻ' : 'Remove tag'}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {resourcesDraft.length === 0 ? (
                    <p className="py-1 text-center text-xs italic text-slate-400">{t('no_resources_added')}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                {t('custom_fields')}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setCustomFieldsDraft((rows) => [...rows, { label: '', value: '' }])
                }
                className="inline-flex items-center gap-1 text-xs font-bold text-accent-primary hover:underline"
              >
                <Plus size={14} /> {t('add_field')}
              </button>
            </div>
            <div className="space-y-3">
              {customFieldsDraft.map((field, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t('field_label')}
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        setCustomFieldsDraft((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], label: e.target.value };
                          return next;
                        })
                      }
                      placeholder={t('ph_field_label')}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t('field_value')}
                    </label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        setCustomFieldsDraft((rows) => {
                          const next = [...rows];
                          next[idx] = { ...next[idx], value: e.target.value };
                          return next;
                        })
                      }
                      placeholder={t('ph_field_value')}
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomFieldsDraft((rows) => rows.filter((_, i) => i !== idx))
                    }
                    className="flex shrink-0 items-center justify-center self-end rounded-xl p-2.5 text-rose-500 transition-colors hover:bg-rose-50 sm:mb-0.5"
                    aria-label={language === 'vi' ? 'Xóa trường' : 'Remove field'}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {customFieldsDraft.length === 0 ? (
                <p className="py-2 text-center text-xs italic text-slate-400">{t('no_custom_fields')}</p>
              ) : null}
            </div>
          </div>

          {/* Files */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">{t('pd_project_files')}</h3>
              <button
                type="button"
                disabled={isUploadingProjectFiles}
                onClick={openAddProjectFileModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} />
                {t('pd_add_file_tag')}
              </button>
            </div>
            <p className="mb-3 text-[10px] text-slate-400">
              {language === 'vi' ? 'Tối đa 10MB mỗi tệp.' : 'Max 10MB per file.'}
            </p>
            {projectFilesError ? (
              <p className="mb-3 text-xs font-medium text-rose-600">{projectFilesError}</p>
            ) : null}
            <div className="space-y-4">
              {(project.files || []).length > 0 ? (
                (project.files || []).map((file) => {
                  const inner = (
                    <>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition-colors group-hover:text-accent-primary">
                        <Paperclip size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700">{file.name}</p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">{file.size}</p>
                      </div>
                    </>
                  );
                  return (
                    <div
                      key={file.id}
                      className="group flex items-center justify-between gap-2 rounded-xl border border-transparent p-2 transition-colors hover:border-slate-100 hover:bg-slate-50/80"
                    >
                      {file.url ? (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          {inner}
                          <ExternalLink size={14} className="shrink-0 text-slate-300 group-hover:text-slate-500" />
                        </a>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
                      )}
                      <button
                        type="button"
                        onClick={() => void deleteFile(project.id, file.id)}
                        className="shrink-0 p-2 text-slate-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-xs italic text-slate-400">{t('pd_no_files')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add project file modal */}
      <AnimatePresence>
        {isAddProjectFileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddProjectFileModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900">{t('pd_add_project_file')}</h2>
                <button
                  type="button"
                  onClick={closeAddProjectFileModal}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmitAddProjectFile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('pd_file_name')}
                  </label>
                  <input
                    type="text"
                    value={projectFileDisplayName}
                    onChange={(e) => setProjectFileDisplayName(e.target.value)}
                    placeholder={t('ph_pd_file_name')}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('pd_select_file')}
                  </span>
                  <label className="block cursor-pointer">
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:border-accent-primary/40 hover:bg-accent-light/20">
                      <Upload size={20} className="shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-700">
                          {pendingProjectFile ? pendingProjectFile.name : t('pd_no_file_selected')}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'vi' ? 'Tối đa 10MB' : 'Max 10MB'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setPendingProjectFile(f);
                        if (f) {
                          setProjectFileDisplayName((prev) => (prev.trim() ? prev : f.name));
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                {projectFilesError ? (
                  <p className="text-xs font-medium text-rose-600">{projectFilesError}</p>
                ) : null}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeAddProjectFileModal}
                    className="flex-1 rounded-xl bg-slate-50 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingProjectFiles}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingProjectFiles ? <Loader2 size={16} className="animate-spin" /> : null}
                    {t('pd_add_file')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddTaskModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
              <h2 className="mb-6 text-xl font-bold text-slate-900">{t('pd_add_new_task')}</h2>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pd_task_title')}</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={t('pd_task_placeholder')}
                    className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('priority')}</label>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p as any)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                          newTaskPriority === p ? "bg-accent-primary text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        {p === 'Low' ? t('low') : p === 'Medium' ? t('medium') : t('high')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddTaskModalOpen(false)}
                    className="flex-1 rounded-xl bg-slate-50 py-2.5 font-bold text-slate-600"
                  >
                    {t('cancel')}
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-accent-primary py-2.5 font-bold text-white">
                    {t('add_task')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddMemberModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
              <h2 className="mb-6 text-xl font-bold text-slate-900">{t('pd_assign_member')}</h2>
              <div className="space-y-3">
                {partners.filter((p) => p.id).map((p) => (
                  <button 
                    key={p.id}
                    type="button"
                    onClick={() => handleAddMember(p.id)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                  >
                    <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 group-hover:text-accent-primary transition-colors">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.role}</p>
                    </div>
                    <Plus size={18} className="text-slate-300 group-hover:text-accent-primary" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
