import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  PenLine,
  Calendar,
  Smile,
  AlertCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Flame,
  Save,
  Loader2,
  X,
  Zap,
  Coffee
} from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { useSettings } from '../context/SettingsContext';
import {
  fetchDailyLogs,
  fetchDailyLogByDate,
  saveDailyLog,
  DailyLog as DailyLogType
} from '../hooks/useDatabase';
import { format, addDays, subDays, startOfWeek, isToday, isSameDay } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

const WEEKDAY_I18N_KEYS = [
  'weekday_sun',
  'weekday_mon',
  'weekday_tue',
  'weekday_wed',
  'weekday_thu',
  'weekday_fri',
  'weekday_sat',
] as const;

const MOOD_DEFS = [
  { id: 'happy', labelKey: 'mood_happy', emoji: '😊', color: 'text-yellow-500' },
  { id: 'productive', labelKey: 'mood_productive', emoji: '🚀', color: 'text-green-500' },
  { id: 'neutral', labelKey: 'mood_neutral', emoji: '😐', color: 'text-slate-400' },
  { id: 'tired', labelKey: 'mood_tired', emoji: '😴', color: 'text-blue-400' },
  { id: 'stressed', labelKey: 'mood_stressed', emoji: '😫', color: 'text-rose-500' },
] as const;

function calcStreak(logs: DailyLogType[]) {
  let streak = 0;
  let date = new Date();
  while (true) {
    const found = logs.find(l => l.log_date === format(date, 'yyyy-MM-dd'));
    if (!found) break;
    streak++;
    date = subDays(date, 1);
  }
  return streak;
}

export default function DailyLog() {
  const { t, language } = useSettings();
  const { projects } = useProjects();
  const locale = language === 'vi' ? vi : enUS;

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [logs, setLogs] = useState<DailyLogType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [content, setContent] = useState('');
  const [accomplishments, setAccomplishments] = useState<string[]>(['']);
  const [blockers, setBlockers] = useState('');
  const [mood, setMood] = useState<string>('neutral');
  const [hoursLogged, setHoursLogged] = useState(0);
  const [projectId, setProjectId] = useState('');
  const [currentLogId, setCurrentLogId] = useState<string | undefined>(undefined);

  // Week navigation
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate.getTime()]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart.getTime()]);

  // Stats
  const stats = useMemo(() => {
    const thisWeekLogs = logs.filter(l => {
      const d = new Date(l.log_date);
      return d >= weekStart && d <= addDays(weekStart, 6);
    });
    const totalHours = logs.reduce((acc, l) => acc + (l.hours_logged || 0), 0);
    const streak = calcStreak(logs);
    return { thisWeek: thisWeekLogs.length, totalHours, streak };
  }, [logs, weekStart.getTime()]);

  const currentLog = useMemo(
    () => logs.find(l => l.log_date === format(selectedDate, 'yyyy-MM-dd')),
    [logs, selectedDate.getTime()]
  );

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate.getTime()]);

  // Load all logs once on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDailyLogs(90)
      .then(data => { if (!cancelled) setLogs(data); })
      .catch(e => console.error('Failed to load logs:', e))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load day log when date changes
  useEffect(() => {
    let cancelled = false;
    fetchDailyLogByDate(dateStr)
      .then(existing => {
        if (cancelled) return;
        if (existing) {
          setContent(existing.content || '');
          setAccomplishments(existing.accomplishments?.length ? existing.accomplishments : ['']);
          setBlockers(existing.blockers || '');
          setMood(existing.mood || 'neutral');
          setHoursLogged(existing.hours_logged || 0);
          setProjectId(existing.project_id || '');
          setCurrentLogId(existing.id);
        } else {
          setContent('');
          setAccomplishments(['']);
          setBlockers('');
          setMood('neutral');
          setHoursLogged(0);
          setProjectId('');
          setCurrentLogId(undefined);
        }
      })
      .catch(e => console.error('Failed to load day log:', e));
    return () => { cancelled = true; };
  }, [dateStr]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const filteredAcc = accomplishments.filter(a => a.trim());
      const saved: DailyLogType = await saveDailyLog({
        id: currentLogId,
        log_date: dateStr,
        content,
        accomplishments: filteredAcc,
        blockers,
        mood,
        hours_logged: hoursLogged,
        project_id: projectId || undefined,
      });
      if (currentLogId) {
        setLogs(prev => prev.map(l => l.id === saved.id ? saved : l));
      } else {
        setLogs(prev => [saved, ...prev]);
        setCurrentLogId(saved.id);
      }
    } catch (e) {
      console.error('Failed to save log:', e);
      alert(t('err_daily_save'));
    } finally {
      setIsSaving(false);
    }
  }, [currentLogId, dateStr, content, accomplishments, blockers, mood, hoursLogged, projectId, t]);

  const handleAddAccomplishment = useCallback(() => {
    setAccomplishments(prev => [...prev, '']);
  }, []);

  const handleAccChange = useCallback((index: number, value: string) => {
    setAccomplishments(prev => prev.map((a, i) => (i === index ? value : a)));
  }, []);

  const handleRemoveAcc = useCallback((index: number) => {
    setAccomplishments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const prevWeek = useCallback(() => {
    setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }, []);

  const nextWeek = useCallback(() => {
    setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }, []);

  const selectedMood = useMemo(() => MOOD_DEFS.find(m => m.id === mood), [mood]);

  const weekSummary = useMemo(() => {
    return logs
      .filter(l => {
        const d = new Date(l.log_date);
        return d >= weekStart && d <= addDays(weekStart, 6);
      })
      .sort((a, b) => a.log_date.localeCompare(b.log_date));
  }, [logs, weekStart.getTime()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <PenLine size={28} className="text-accent-primary" />
            {t('daily_log')}
          </h1>
          <p className="text-slate-500 mt-1">{t('daily_subtitle')}</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { labelKey: 'daily_stat_days_logged', value: logs.length, icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
          { labelKey: 'daily_stat_hours', value: stats.totalHours, icon: Clock, color: 'bg-emerald-50 text-emerald-600' },
          { labelKey: 'daily_stat_streak', value: stats.streak, icon: Flame, color: 'bg-orange-50 text-orange-500' },
        ].map(stat => (
          <div key={stat.labelKey} className={`flex items-center gap-4 p-4 rounded-2xl ${stat.color}`}>
            <div className="p-2 rounded-xl bg-white/50"><stat.icon size={20} /></div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium opacity-70">{t(stat.labelKey)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Week Navigator */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevWeek} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h3 className="font-bold text-slate-900">
            {format(weekStart, 'MMMM d', { locale })} – {format(addDays(weekStart, 6), 'MMMM d, yyyy', { locale })}
          </h3>
          <button onClick={nextWeek} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const log = logs.find(l => l.log_date === format(day, 'yyyy-MM-dd'));
            const active = isToday(day);
            const selected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(new Date(day))}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  selected ? 'bg-accent-primary text-white shadow-lg shadow-accent-primary/20' : active ? 'bg-accent-light text-accent-primary' : 'hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase opacity-60">{t(WEEKDAY_I18N_KEYS[day.getDay()])}</span>
                <span className="text-lg font-bold">{day.getDate()}</span>
                {log && <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : 'bg-emerald-500'}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Log Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date Header */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isToday(selectedDate) ? t('daily_today') : format(selectedDate, 'EEEE, MMMM d, yyyy', { locale })}
                </h3>
                {currentLog && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} /> {t('daily_saved')}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {MOOD_DEFS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    title={t(m.labelKey)}
                    className={`p-2 rounded-xl transition-all ${mood === m.id ? `${m.color} bg-slate-50` : 'opacity-40 hover:opacity-80'}`}
                  >
                    <span className="text-lg">{m.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accomplishments */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-accent-primary" />
              {t('daily_what_done')}
            </h4>
            <div className="space-y-2">
              {accomplishments.map((acc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center text-accent-primary text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <input
                    type="text"
                    value={acc}
                    onChange={e => handleAccChange(i, e.target.value)}
                    placeholder={t('ph_daily_acc')}
                    className="flex-1 px-3 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 outline-none"
                  />
                  {accomplishments.length > 1 && (
                    <button onClick={() => handleRemoveAcc(i)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={handleAddAccomplishment} className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 hover:text-accent-primary transition-colors">
                <Plus size={14} /> {t('daily_add_item')}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <PenLine size={18} className="text-accent-primary" />
              {t('daily_notes_title')}
            </h4>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              placeholder={t('ph_daily_notes')}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 outline-none resize-none"
            />
          </div>

          {/* Blockers */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-rose-500" />
              {t('daily_blockers_title')}
            </h4>
            <textarea
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              rows={2}
              placeholder={t('ph_daily_blockers')}
              className="w-full px-4 py-3 bg-rose-50/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-rose-200/50 outline-none resize-none"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {t('daily_save_log')}
          </button>
        </div>

        {/* Right: History & Meta */}
        <div className="space-y-4">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h4 className="font-bold text-slate-900">{t('daily_details')}</h4>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('daily_hours')}</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={12} step={0.5} value={hoursLogged} onChange={e => setHoursLogged(parseFloat(e.target.value))} className="flex-1 accent-accent-primary" />
                <span className="w-12 text-center font-bold text-slate-900">{hoursLogged}h</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">{t('daily_project')}</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-sm outline-none">
                <option value="">{t('daily_project_placeholder')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {selectedMood && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <span className="text-2xl">{selectedMood.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t(selectedMood.labelKey)}</p>
                  <p className="text-xs text-slate-500">{t('daily_mood_today')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Week Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
            <h4 className="font-bold text-slate-900">{t('daily_this_week')}</h4>
            {weekSummary.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {t('daily_no_logs_week')}
              </p>
            ) : (
              weekSummary.map(log => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <div className="w-8 h-8 bg-accent-light rounded-lg flex items-center justify-center text-accent-primary text-xs font-bold shrink-0">
                    {new Date(log.log_date).getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 truncate">
                      {log.accomplishments?.[0] || log.content || t('daily_no_preview')}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{log.hours_logged}h</span>
                      {log.mood && <span className="text-[10px]">{MOOD_DEFS.find(m => m.id === log.mood)?.emoji}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
