import type { ProjectStatus, PaymentStatus, ProjectType } from '../types';

export const STATUS_TKEY: Partial<Record<ProjectStatus, string>> = {
  Planning: 'planning',
  'In Progress': 'status_in_progress',
  Review: 'status_review',
  Completed: 'status_completed',
  Maintenance: 'status_maintenance',
  'On Hold': 'status_on_hold',
  Cancelled: 'status_cancelled',
};

export const TYPE_TKEY: Record<ProjectType, string> = {
  Freelance: 'type_freelance',
  Corporate: 'type_corporate',
  Internal: 'type_internal',
  Personal: 'type_personal',
};

export const PAYMENT_TKEY: Record<PaymentStatus, string> = {
  Unpaid: 'payment_unpaid',
  Partial: 'payment_partial',
  Paid: 'payment_paid',
};

export function translateStatus(status: ProjectStatus, t: (key: string) => string) {
  const key = STATUS_TKEY[status];
  return key ? t(key) : status;
}

export function translateType(type: ProjectType, t: (key: string) => string) {
  const key = TYPE_TKEY[type];
  return key ? t(key) : type;
}

export function translatePayment(ps: PaymentStatus, t: (key: string) => string) {
  return t(PAYMENT_TKEY[ps]);
}
