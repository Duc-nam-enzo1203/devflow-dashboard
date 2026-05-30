import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval
} from 'date-fns';
import { enUS, vi as dateFnsVi } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useEvents } from '../context/EventsContext';
import { useSettings } from '../context/SettingsContext';

const WEEKDAY_KEYS = ['weekday_sun', 'weekday_mon', 'weekday_tue', 'weekday_wed', 'weekday_thu', 'weekday_fri', 'weekday_sat'] as const;

const EVENT_TYPE_OPTIONS = [
  { value: 'general', labelKey: 'event_type_general' },
  { value: 'Freelance', labelKey: 'type_freelance' },
  { value: 'Corporate', labelKey: 'type_corporate' },
] as const;

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();
  const { t, language } = useSettings();
  const dateLocale = language === 'vi' ? dateFnsVi : enUS;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'general',
    time: '09:00',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(new Date(e.date), day));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setEditingEventId(null);
    setNewEvent({ title: '', type: 'general', time: '09:00', description: '' });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    const ev = events.find(ev => ev.id === eventId);
    if (!ev) return;
    setSelectedDate(new Date(ev.date));
    setEditingEventId(eventId);
    setNewEvent({
      title: ev.title,
      type: ev.type,
      time: '09:00',
      description: ev.description || ''
    });
    setIsModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedDate(new Date());
    setEditingEventId(null);
    setNewEvent({ title: '', type: 'general', time: '09:00', description: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newEvent.title.trim()) return;

    setIsSaving(true);
    try {
      if (editingEventId) {
        await updateEvent(editingEventId, {
          title: newEvent.title,
          date: format(selectedDate, 'yyyy-MM-dd'),
          type: newEvent.type,
          description: newEvent.description,
        });
        alert(t('cal_success_updated'));
      } else {
        await addEvent({
          title: newEvent.title,
          date: format(selectedDate, 'yyyy-MM-dd'),
          type: newEvent.type,
          description: newEvent.description,
        });
        alert(t('cal_success_created'));
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save event:', err);
      alert(t('err_save_event'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete_event'))) return;
    setIsDeleting(true);
    try {
      await deleteEvent(id);
      setIsModalOpen(false);
      alert(t('cal_success_deleted'));
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert(t('err_delete_event'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('calendar')}</h1>
          <p className="text-slate-500 mt-1">{t('calendar_subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-xl border border-slate-100 shadow-sm p-1">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-bold text-slate-900 min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={handleNewEvent}
            className="bg-accent-primary hover:opacity-90 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent-primary/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{t('new_event')}</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAY_KEYS.map((key) => (
            <div key={key} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t(key)}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[120px] p-3 border-b border-r border-slate-50 transition-colors hover:bg-slate-50/50 group cursor-pointer",
                  !isCurrentMonth && "bg-slate-50/30 text-slate-300",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                    isToday ? "bg-accent-primary text-white shadow-md shadow-accent-primary/20" : "text-slate-600 group-hover:text-accent-primary"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  {dayEvents.map(ev => (
                    <div
                      key={ev.id}
                      onClick={(e) => handleEventClick(e, ev.id)}
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold truncate transition-all hover:scale-105 cursor-pointer",
                        ev.type === 'Freelance' ? "bg-accent-light text-accent-primary border-l-2 border-accent-primary" :
                        ev.type === 'Corporate' ? "bg-slate-100 text-slate-600 border-l-2 border-slate-600" :
                        "bg-indigo-50 text-indigo-600 border-l-2 border-indigo-400"
                      )}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingEventId ? t('edit_event') : t('create_event')}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </header>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('event_title')}</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder={t('cal_ph_title')}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('date')}</label>
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600">
                      <CalendarIcon size={16} className="text-slate-400" />
                      <span>
                        {selectedDate ? format(selectedDate, 'PPP', { locale: dateLocale }) : t('cal_select_date')}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('time')}</label>
                    <div className="relative">
                      <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('type')}</label>
                  <div className="flex gap-2">
                    {EVENT_TYPE_OPTIONS.map(({ value: type, labelKey }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, type })}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all",
                          newEvent.type === type
                            ? "bg-accent-light border-accent-primary text-accent-primary"
                            : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {t(labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">{t('description')}</label>
                  <textarea 
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder={t('cal_ph_description')}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingEventId)}
                      disabled={isDeleting}
                      className="flex-1 py-3 bg-rose-50 text-rose-500 font-bold rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {t('delete')}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving || !newEvent.title.trim()}
                    className="flex-[2] py-3 bg-accent-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-accent-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {editingEventId ? t('save_changes') : t('create_event')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
