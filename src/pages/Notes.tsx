import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Search,
  Plus,
  StickyNote,
  MoreVertical,
  Trash2,
  Pin,
  Tag,
  Clock,
  X,
  Edit2,
  GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProjects } from '../context/ProjectsContext';
import { useSettings } from '../context/SettingsContext';
import { Note } from '../types';
import { cn } from '../lib/utils';
import { NOTE_CATEGORY_VALUES, displayNoteCategory } from '../lib/noteCategories';

function compareNotes(a: Note, b: Note) {
  if (a.isPinned && !b.isPinned) return -1;
  if (!a.isPinned && b.isPinned) return 1;
  const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (so !== 0) return so;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

/** Shared card UI — used in grid and in DragOverlay (follows cursor while dragging). */
function NoteCardVisual({
  note,
  t,
  dragHandleSlot,
  onTogglePin,
  onEdit,
  onDelete,
  isOverlay,
}: {
  note: Note;
  t: (key: string) => string;
  dragHandleSlot?: React.ReactNode;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOverlay?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOverlay) setMenuOpen(false);
  }, [isOverlay]);

  useEffect(() => {
    if (!menuOpen || isOverlay) return;
    const closeOnOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen, isOverlay]);

  return (
    <div
      className={cn(
        'group relative flex h-64 flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm',
        note.isPinned && 'border-accent-primary/30 bg-accent-light/5',
        isOverlay &&
          'cursor-grabbing shadow-2xl ring-2 ring-accent-primary/25 [box-shadow:0_25px_50px_-12px_rgba(0,0,0,0.25)]'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {dragHandleSlot}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
              <StickyNote size={16} />
            </div>
            <span className="truncate rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {displayNoteCategory(note.category, t)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onTogglePin}
            disabled={isOverlay}
            className={cn(
              'cursor-pointer rounded-lg p-1.5 transition-all disabled:cursor-not-allowed',
              note.isPinned
                ? 'bg-accent-light text-accent-primary'
                : 'text-slate-300 hover:text-slate-500',
              isOverlay && 'pointer-events-none opacity-80'
            )}
          >
            <Pin size={14} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              disabled={isOverlay}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={t('notes_actions_menu')}
              onClick={(e) => {
                e.stopPropagation();
                if (!isOverlay) setMenuOpen((v) => !v);
              }}
              className={cn(
                'cursor-pointer rounded-lg p-1.5 text-slate-300 transition-all hover:text-slate-500 disabled:cursor-not-allowed',
                menuOpen && 'bg-slate-100 text-slate-600',
                isOverlay && 'pointer-events-none'
              )}
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 w-32 rounded-xl border border-slate-100 bg-white py-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Edit2 size={12} /> {t('notes_edit')}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={12} /> {t('delete')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <h3 className="mb-2 line-clamp-1 font-bold text-slate-900">{note.title}</h3>
      <p className="line-clamp-4 flex-1 whitespace-pre-wrap text-sm text-slate-500">{note.content}</p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4 text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span className="text-[10px] font-medium">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>
        <Tag size={12} className="opacity-30" />
      </div>
    </div>
  );
}

function SortableNoteCard({
  note,
  sortable,
  t,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  note: Note;
  sortable: boolean;
  t: (key: string) => string;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: !sortable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 0 : undefined,
  };

  const dragHandle =
    sortable ? (
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
        aria-label={t('notes_drag_handle')}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
    ) : null;

  return (
    <div ref={setNodeRef} style={style} className="touch-manipulation">
      <NoteCardVisual
        note={note}
        t={t}
        dragHandleSlot={dragHandle}
        onTogglePin={onTogglePin}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export default function Notes() {
  const { t } = useSettings();
  const { notes, addNote, updateNote, deleteNote, reorderNotes } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState<Partial<Note>>({
    title: '',
    content: '',
    category: 'General',
    isPinned: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const presetCategories = new Set<string>(NOTE_CATEGORY_VALUES);
  const orphanCategories = Array.from(
    new Set<string>(notes.map((n) => n.category).filter((c) => !presetCategories.has(c)))
  );
  const categories: string[] = ['All', ...NOTE_CATEGORY_VALUES, ...orphanCategories];

  /** Presets first, then other labels already used on notes (for datalist suggestions). */
  const categoryDatalistOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of NOTE_CATEGORY_VALUES) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    for (const n of notes) {
      const c = (n.category ?? '').trim();
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [notes]);

  const filteredNotes = notes
    .filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || n.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort(compareNotes);

  const canReorder = selectedCategory === 'All' && !searchQuery.trim();

  const [activeNote, setActiveNote] = useState<Note | null>(null);

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (!canReorder) return;
    const id = active.id as string;
    setActiveNote(filteredNotes.find((n) => n.id === id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveNote(null);
    if (!canReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = filteredNotes.map((n) => n.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    void reorderNotes(next);
  };

  const handleDragCancel = () => setActiveNote(null);

  const handleOpenModal = (note?: Note) => {
    setFormError(null);
    if (note) {
      setEditingNote(note);
      setFormData(note);
    } else {
      setEditingNote(null);
      setFormData({
        title: '',
        content: '',
        category: 'General',
        isPinned: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          isPinned: formData.isPinned,
        });
      } else {
        await addNote({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          isPinned: formData.isPinned,
        });
      }
      setIsModalOpen(false);
    } catch {
      setFormError(t('err_note_save'));
    }
  };

  const togglePin = (note: Note) => {
    updateNote(note.id, { isPinned: !note.isPinned });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('notes')}</h1>
          <p className="mt-1 text-slate-500">{t('notes_subtitle')}</p>
          <p className="mt-2 text-xs text-slate-400">
            {canReorder ? t('notes_drag_hint') : t('notes_drag_disabled')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent-primary px-5 py-2.5 font-medium text-white shadow-lg shadow-accent-primary/20 transition-all hover:opacity-90"
        >
          <Plus size={18} />
          <span>{t('notes_new')}</span>
        </button>
      </header>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('notes_search_ph')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
          />
        </div>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all',
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'border border-slate-100 bg-white text-slate-500 hover:border-slate-200'
              )}
            >
              {cat === 'All' ? t('filter_all') : displayNoteCategory(cat, t)}
            </button>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={filteredNotes.map((n) => n.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note: Note) => (
              <React.Fragment key={note.id}>
                <SortableNoteCard
                  note={note}
                  sortable={canReorder}
                  t={t}
                  onTogglePin={() => togglePin(note)}
                  onEdit={() => handleOpenModal(note)}
                  onDelete={() => deleteNote(note.id)}
                />
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
          className="z-[9999]"
        >
          {activeNote ? (
            <div className="w-[min(calc(100vw-2rem),22rem)] rotate-1 scale-[1.02] will-change-transform">
              <NoteCardVisual
                note={activeNote}
                t={t}
                dragHandleSlot={
                  <span className="shrink-0 rounded-lg p-1.5 text-slate-400">
                    <GripVertical size={18} />
                  </span>
                }
                onTogglePin={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {filteredNotes.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
            <StickyNote size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t('notes_empty_title')}</h3>
          <p className="text-slate-500">{t('notes_empty_hint')}</p>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <header className="flex items-center justify-between border-b border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingNote ? t('notes_modal_edit') : t('notes_modal_new')}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-8">
                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('note_title')}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('ph_note_title')}
                    className="w-full rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('note_category')}
                    </label>
                    <input
                      type="text"
                      list="note-category-datalist"
                      value={formData.category ?? ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder={t('ph_note_category')}
                      autoComplete="off"
                      className="w-full rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                    />
                    <datalist id="note-category-datalist">
                      {categoryDatalistOptions.map((value) => (
                        <option key={value} value={value}>
                          {displayNoteCategory(value, t)}
                        </option>
                      ))}
                    </datalist>
                    <p className="text-[11px] leading-snug text-slate-400">{t('note_category_hint')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('note_pin_label')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isPinned: !formData.isPinned })}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
                        formData.isPinned ? 'bg-accent-primary text-white' : 'bg-slate-50 text-slate-500'
                      )}
                    >
                      <Pin size={16} /> {formData.isPinned ? t('note_state_pinned') : t('note_action_pin')}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('note_content')}
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={t('ph_note_content')}
                    className="w-full resize-none rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-accent-primary/20"
                  />
                </div>

                {formError ? (
                  <p className="text-sm font-medium text-rose-600" role="alert">
                    {formError}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="cursor-pointer rounded-xl bg-slate-50 px-6 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-accent-primary px-6 py-2.5 font-bold text-white shadow-lg shadow-accent-primary/20 transition-all hover:opacity-90"
                  >
                    {editingNote ? t('note_update') : t('note_save')}
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
