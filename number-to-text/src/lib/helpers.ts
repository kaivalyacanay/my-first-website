export const MAX_VALUE = 9_999_999_999;

export type NumberingSystem = 'international' | 'indian';

export const sentenceCase = (value: string): string => {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export const sanitizeNumericInput = (value: string): string => value.replace(/,/g, '');

export const isValidDigitsOnly = (value: string): boolean => /^[0-9]+$/.test(value);

export const detectSystemFromLocale = (locale?: string): NumberingSystem => {
  const language = (locale ?? '').toLowerCase();
  if (language.includes('-in') || language.endsWith('in')) {
    return 'indian';
  }
  return 'international';
};

export const loadPersistedSystem = (): NumberingSystem | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem('number-to-text:system');
    if (stored === 'international' || stored === 'indian') {
      return stored;
    }
  } catch (error) {
    console.warn('Unable to read stored numbering system', error);
  }
  return null;
};

export const persistSystem = (system: NumberingSystem): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('number-to-text:system', system);
  } catch (error) {
    console.warn('Unable to persist numbering system', error);
  }
};
