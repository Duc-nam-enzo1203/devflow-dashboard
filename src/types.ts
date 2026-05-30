export type ProjectStatus = 'Planning' | 'In Progress' | 'Review' | 'Completed' | 'Maintenance' | 'On Hold' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';
export type ProjectType = 'Freelance' | 'Corporate' | 'Internal' | 'Personal';

export interface CustomField {
  label: string;
  value: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  /** Supabase Storage path within bucket `project-files` (for delete). */
  storagePath?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  date?: string;
}

export interface Project {
  id: string;
  /** URL segment for /app/projects/:slug (unique per user). */
  slug: string;
  name: string;
  type: ProjectType;
  client: string;
  logoUrl?: string;
  resources: string[];
  demoLink?: string;
  liveLink?: string;
  hostingInfo?: string;
  amount: number;
  progress: number;
  paymentStatus: PaymentStatus;
  status: ProjectStatus;
  deadline: string;
  createdAt: string;
  customFields?: CustomField[];
  partnerId?: string;
  tasks?: Task[];
  files?: ProjectFile[];
}

export interface Partner {
  id: string;
  name: string;
  role: string;
  email: string;
  zalo?: string;
  phone?: string;
  avatar?: string;
  projects: string[];
}

export interface PlanItem {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Todo' | 'Doing' | 'Done';
  date: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  /** Lower = earlier in list (after pin grouping). */
  sortOrder?: number;
}
