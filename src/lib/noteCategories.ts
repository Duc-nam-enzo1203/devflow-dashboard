/** Built-in category keys (stored as-is); labels come from i18n. Any other string is a custom category. */
export const NOTE_CATEGORY_VALUES = ['General', 'Work', 'Personal', 'Reference', 'Ideas'] as const;
export type NoteCategoryValue = (typeof NOTE_CATEGORY_VALUES)[number];

const CATEGORY_I18N_KEYS: Record<string, string> = {
  General: 'note_cat_general',
  Work: 'note_cat_work',
  Personal: 'note_cat_personal',
  Reference: 'note_cat_reference',
  Ideas: 'note_cat_ideas',
};

export function displayNoteCategory(cat: string, t: (key: string) => string): string {
  const key = CATEGORY_I18N_KEYS[cat];
  return key ? t(key) : cat;
}

const NOTE_CATEGORY_MAX_LEN = 120;

export function normalizeNoteCategory(value: string | undefined): string {
  const v = (value ?? '').trim().slice(0, NOTE_CATEGORY_MAX_LEN);
  return v || 'General';
}
