import { createClient } from '@supabase/supabase-js';
import type { Project, Partner, Task, PlanItem, Note, ProjectFile } from '../types';
import { slugifyProjectName } from './slug';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// =============================================
// Database types (matching the schema)
// =============================================
export interface DBProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  notify_email: boolean;
  notify_desktop: boolean;
  notify_mobile: boolean;
  notify_marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBPartner {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  email: string | null;
  zalo: string | null;
  phone: string | null;
  avatar: string | null;
  projects: string[];
  created_at: string;
  updated_at: string;
}

export interface DBProject {
  id: string;
  user_id: string;
  slug?: string | null;
  name: string;
  type: 'Freelance' | 'Corporate' | 'Internal' | 'Personal';
  client: string | null;
  logo_url: string | null;
  status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number;
  deadline: string | null;
  amount: number;
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  description: string | null;
  demo_link: string | null;
  live_link: string | null;
  hosting_info: string | null;
  resources: string[];
  tasks: Task[];
  files: ProjectFile[];
  partner_id: string | null;
  custom_fields: { label: string; value: string }[];
  created_at: string;
  updated_at: string;
}

export interface DBTask {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  date: string | null;
  assigned_to: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DBPlanItem {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'Doing' | 'Done';
  date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface DBEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  type: string;
  description: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Mapper: Database row → App types
// =============================================

export function mapDBProject(db: DBProject | null | undefined): Project {
  if (!db?.id) {
    throw new Error('Invalid project row from database');
  }
  return {
    id: db.id,
    slug:
      (db.slug && String(db.slug).trim()) ||
      slugifyProjectName(db.name || '') ||
      `p-${db.id.replace(/-/g, '').slice(0, 12)}`,
    name: db.name,
    type: db.type,
    client: db.client || '',
    logoUrl: db.logo_url || undefined,
    resources: db.resources || [],
    demoLink: db.demo_link || undefined,
    liveLink: db.live_link || undefined,
    hostingInfo: db.hosting_info || undefined,
    amount: db.amount,
    progress: db.progress,
    paymentStatus: db.payment_status,
    status: db.status,
    deadline: db.deadline || '',
    createdAt: db.created_at,
    partnerId: db.partner_id || undefined,
    customFields: db.custom_fields || [],
    tasks: db.tasks || [],
    files: db.files || [],
  };
}

export function mapDBTask(db: Partial<DBTask> & { id: string }): Task {
  return {
    id: db.id,
    title: db.title ?? '',
    description: db.description ?? undefined,
    status: db.status ?? 'Todo',
    priority: db.priority ?? 'Medium',
    date: db.date ?? undefined,
  };
}

export function mapDBPartner(db: DBPartner | null | undefined): Partner {
  if (!db?.id) {
    throw new Error('Invalid partner row from database');
  }
  return {
    id: db.id,
    name: db.name,
    role: db.role || '',
    email: db.email || '',
    zalo: db.zalo || undefined,
    avatar: db.avatar || undefined,
    projects: db.projects || [],
  };
}

export function mapDBPlanItem(db: DBPlanItem): PlanItem {
  return {
    id: db.id,
    title: db.title,
    description: db.description || '',
    priority: db.priority,
    status: db.status,
    date: db.date || '',
  };
}

export function mapDBNote(db: DBNote): Note {
  return {
    id: db.id,
    title: db.title,
    content: db.content,
    category: db.category,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    isPinned: db.is_pinned,
    sortOrder: db.sort_order ?? 0,
  };
}
