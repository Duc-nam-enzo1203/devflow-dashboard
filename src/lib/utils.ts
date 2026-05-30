import type { CSSProperties } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Stored amounts in the app are always VND. USD is display/input for English UI only. */
export const VND_PER_USD = 25000;

export type AppLanguage = 'en' | 'vi';

/** Format a VND stored amount for the current UI language (EN → USD, VI → VND). */
export function formatMoney(vndAmount: number, language: AppLanguage): string {
  if (Number.isNaN(vndAmount)) return '—';
  if (language === 'vi') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(vndAmount);
  }
  const usd = vndAmount / VND_PER_USD;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd);
}

/** Compact currency for chart axes / tooltips */
export function formatMoneyCompact(vndAmount: number, language: AppLanguage): string {
  if (language === 'vi') {
    return new Intl.NumberFormat('vi-VN', {
      notation: 'compact',
      compactDisplay: 'short',
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 1,
    }).format(vndAmount);
  }
  const usd = vndAmount / VND_PER_USD;
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(usd);
}

/** Input field: show USD when English, VND when Vietnamese */
export function vndToFormInput(vnd: number, language: AppLanguage): number {
  if (language === 'en') return vnd / VND_PER_USD;
  return vnd;
}

export function formInputToVnd(display: number, language: AppLanguage): number {
  if (Number.isNaN(display)) return 0;
  if (language === 'en') return Math.round(display * VND_PER_USD);
  return Math.round(display);
}

/** Filled track color for `<input type="range" min={0} max={100} />` (uses --accent-primary + --range-track-rest). */
export function progressRangeStyle(progress: number): CSSProperties {
  const p = Math.min(100, Math.max(0, Math.round(Number(progress))));
  return {
    background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${p}%, var(--range-track-rest) ${p}%, var(--range-track-rest) 100%)`,
  };
}
