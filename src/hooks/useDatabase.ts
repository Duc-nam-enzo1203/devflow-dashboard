import {
  supabase,
  mapDBProject,
  mapDBPartner,
  mapDBPlanItem,
  mapDBNote,
  mapDBTask,
} from '../lib/supabase';
import type { DBProject, DBTask } from '../lib/supabase';
import { normalizeNoteCategory } from '../lib/noteCategories';
import type { Project, Partner, PlanItem, Note, Task, ProjectFile } from '../types';
import { slugifyProjectName } from '../lib/slug';

// =============================================
// PROJECTS
// =============================================

/** Unique slug per user for URLs like /app/projects/suzuki */
async function allocateUniqueSlug(
  userId: string,
  name: string,
  excludeProjectId?: string
): Promise<string> {
  const base = slugifyProjectName(name || 'project');
  let candidate = base;
  let n = 2;
  for (;;) {
    let q = supabase.from('projects').select('id').eq('user_id', userId).eq('slug', candidate).limit(1);
    if (excludeProjectId) {
      q = q.neq('id', excludeProjectId);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 500) throw new Error('Could not allocate project slug');
  }
}

/** Gom task từ bảng `tasks` theo project_id, sort theo order_index. */
function groupTasksByProjectId(rows: DBTask[]): Map<string, Task[]> {
  const buckets = new Map<string, { order_index: number; task: Task }[]>();
  for (const row of rows) {
    const pid = row.project_id;
    if (!pid) continue;
    const list = buckets.get(pid) ?? [];
    list.push({ order_index: row.order_index ?? 0, task: mapDBTask(row) });
    buckets.set(pid, list);
  }
  const out = new Map<string, Task[]>();
  for (const [pid, list] of buckets) {
    list.sort((a, b) => a.order_index - b.order_index);
    out.set(
      pid,
      list.map((x) => x.task)
    );
  }
  return out;
}

export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const projectRows = (data || []) as DBProject[];

  const { data: taskRows, error: tasksError } = await supabase.from('tasks').select('*');

  if (tasksError) throw tasksError;
  const byProject = groupTasksByProjectId((taskRows || []) as DBTask[]);

  return projectRows.map((db) => {
    const p = mapDBProject(db);
    const fromTable = byProject.get(db.id);
    if (fromTable?.length) {
      return { ...p, tasks: fromTable };
    }
    return p;
  });
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  const { data: taskRows, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('order_index', { ascending: true });

  if (tasksError) throw tasksError;

  const p = mapDBProject(data as DBProject);
  const rows = (taskRows || []) as DBTask[];
  if (rows.length > 0) {
    return { ...p, tasks: rows.map((r) => mapDBTask(r)) };
  }
  return p;
}

export async function createProject(project: Partial<Project>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const slug = await allocateUniqueSlug(userId, project.name || 'New Project');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      slug,
      name: project.name || 'New Project',
      type: project.type || 'Freelance',
      client: project.client || null,
      logo_url: project.logoUrl || null,
      status: project.status || 'Planning',
      progress: project.progress || 0,
      deadline: project.deadline || null,
      amount: project.amount || 0,
      payment_status: project.paymentStatus || 'Unpaid',
      description: project.client || null,
      demo_link: project.demoLink || null,
      live_link: project.liveLink || null,
      hosting_info: project.hostingInfo || null,
      resources: project.resources || [],
      tasks: project.tasks || [],
      files: project.files || [],
      partner_id: project.partnerId || null,
      custom_fields: project.customFields || [],
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project was not created');
  return mapDBProject(data);
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) {
    dbUpdates.name = updates.name;
    const { data: row, error: rowErr } = await supabase
      .from('projects')
      .select('user_id, name')
      .eq('id', id)
      .single();
    if (rowErr) throw rowErr;
    const prevName = (row as { user_id: string; name: string | null }).name ?? '';
    if ((updates.name || '').trim() !== prevName.trim()) {
      const uid = (row as { user_id: string }).user_id;
      dbUpdates.slug = await allocateUniqueSlug(uid, updates.name || 'project', id);
    }
  }
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.client !== undefined) dbUpdates.client = updates.client;
  if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
  if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline || null;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
  if (updates.demoLink !== undefined) dbUpdates.demo_link = updates.demoLink || null;
  if (updates.liveLink !== undefined) dbUpdates.live_link = updates.liveLink || null;
  if (updates.hostingInfo !== undefined) dbUpdates.hosting_info = updates.hostingInfo || null;
  if (updates.resources !== undefined) dbUpdates.resources = updates.resources;
  // Use `in` so clearing with `undefined` (remove team member) still writes NULL to partner_id.
  if ('partnerId' in updates) {
    const v = updates.partnerId;
    dbUpdates.partner_id = v != null && v !== '' ? v : null;
  }
  if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
  if (updates.files !== undefined) dbUpdates.files = updates.files;

  const { data, error } = await supabase
    .from('projects')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Project update returned no row');
  return mapDBProject(data);
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// PARTNERS
// =============================================
export async function fetchPartners() {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBPartner);
}

export async function createPartner(partner: Partial<Partner>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('partners')
    .insert({
      user_id: userId,
      name: partner.name || 'New Partner',
      role: partner.role || null,
      email: partner.email || null,
      zalo: partner.zalo || null,
      phone: partner.phone || null,
      avatar: partner.avatar || null,
      projects: partner.projects || [],
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Partner was not created');
  return mapDBPartner(data);
}

export async function updatePartner(id: string, updates: Partial<Partner>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.zalo !== undefined) dbUpdates.zalo = updates.zalo || null;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar || null;
  if (updates.projects !== undefined) dbUpdates.projects = updates.projects;

  const { data, error } = await supabase
    .from('partners')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Partner was not updated');
  return mapDBPartner(data);
}

export async function deletePartner(id: string) {
  const { error } = await supabase.from('partners').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// TASKS
// =============================================
export async function fetchTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createTask(projectId: string, task: Partial<Task>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: projectId,
      user_id: userId,
      title: task.title || 'New Task',
      description: task.description || null,
      status: task.status || 'Todo',
      priority: task.priority || 'Medium',
      date: task.date || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.date !== undefined) dbUpdates.date = updates.date || null;

  const { data, error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// PLAN ITEMS
// =============================================
export async function fetchPlanItems() {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBPlanItem);
}

export async function createPlanItem(item: Partial<PlanItem>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('plan_items')
    .insert({
      user_id: userId,
      title: item.title || 'New Plan Item',
      description: item.description || null,
      priority: item.priority || 'Medium',
      status: item.status || 'Todo',
      date: item.date || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDBPlanItem(data);
}

export async function updatePlanItem(id: string, updates: Partial<PlanItem>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.date !== undefined) dbUpdates.date = updates.date || null;

  const { data, error } = await supabase
    .from('plan_items')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDBPlanItem(data);
}

export async function deletePlanItem(id: string) {
  const { error } = await supabase.from('plan_items').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// NOTES
// =============================================
export async function fetchNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDBNote);
}

export async function createNote(note: Partial<Note>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  // sort_order is managed only by reorderNotes + DB default (migration 009). Omit here so
  // inserts work on DBs without that column and PATCH from the editor does not send sort_order.
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId,
      title: note.title || 'Untitled Note',
      content: note.content || '',
      category: normalizeNoteCategory(note.category),
      is_pinned: note.isPinned || false,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDBNote(data);
}

export async function updateNote(id: string, updates: Partial<Note>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) dbUpdates.content = updates.content;
  if (updates.category !== undefined) dbUpdates.category = normalizeNoteCategory(updates.category);
  if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
  // sort_order: only reorderNotes() updates it — avoids 400 when PATCH included sort_order but
  // schema/client drifted, and keeps editor saves to title/content/category/pin only.

  const { data, error } = await supabase
    .from('notes')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapDBNote(data);
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderNotes(orderedIds: string[]) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const updates = orderedIds.map((id, index) =>
    supabase.from('notes').update({ sort_order: index }).eq('id', id).eq('user_id', userId)
  );
  const results = await Promise.all(updates);
  for (const { error } of results) {
    if (error) throw error;
  }
}

// =============================================
// EVENTS
// =============================================
export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
}

// =============================================
// DAILY LOGS
// =============================================
export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  content: string;
  accomplishments: string[];
  blockers: string;
  mood: 'happy' | 'productive' | 'neutral' | 'tired' | 'stressed';
  hours_logged: number;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchDailyLogs(limit = 30) {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*, project:projects(id, name)')
    .order('log_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchDailyLogByDate(date: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function saveDailyLog(log: {
  id?: string;
  log_date: string;
  content: string;
  accomplishments: string[];
  blockers: string;
  mood: string;
  hours_logged: number;
  project_id?: string;
}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const payload = {
    user_id: userId,
    log_date: log.log_date,
    content: log.content,
    accomplishments: log.accomplishments,
    blockers: log.blockers,
    mood: log.mood,
    hours_logged: log.hours_logged,
    project_id: log.project_id || null,
  };

  if (log.id) {
    // Update existing
    const { data, error } = await supabase
      .from('daily_logs')
      .update(payload)
      .eq('id', log.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Check if exists first, then insert or update
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', log.log_date)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('daily_logs')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('daily_logs')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
}

export async function deleteDailyLog(id: string) {
  const { error } = await supabase.from('daily_logs').delete().eq('id', id);
  if (error) throw error;
}

// =============================================
// AI CHAT
// =============================================
export async function sendAIChat(message: string, history: { role: string; content: string }[]) {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { message, history },
  });

  if (error) throw error;
  return data;
}
