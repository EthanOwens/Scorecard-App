export type AccentKey = 'green' | 'blue' | 'teal' | 'purple' | 'rose' | 'amber';

export const ACCENT_COLORS: { key: AccentKey; label: string; value: string }[] = [
  { key: 'green', label: 'Green', value: '#6FA98A' },
  { key: 'blue', label: 'Blue', value: '#6C93BD' },
  { key: 'teal', label: 'Teal', value: '#5DA39C' },
  { key: 'purple', label: 'Purple', value: '#8C7EBE' },
  { key: 'rose', label: 'Rose', value: '#BD7C8C' },
  { key: 'amber', label: 'Amber', value: '#C2A05E' },
];

export const DEFAULT_ACCENT: AccentKey = 'green';

export function accentValue(key: AccentKey): string {
  return ACCENT_COLORS.find((a) => a.key === key)?.value ?? ACCENT_COLORS[0].value;
}

const NEUTRAL_LIGHT = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F0EE',
  border: '#E3E1DE',
  text: '#2B2A28',
  textMuted: '#6F6D69',
};

const NEUTRAL_DARK = {
  background: '#17181A',
  surface: '#1F2022',
  surfaceAlt: '#272829',
  border: '#34363A',
  text: '#ECECEA',
  textMuted: '#9B9C9E',
};

export interface Theme {
  dark: boolean;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  danger: string;
  dangerSoft: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildTheme(isDark: boolean, accentKey: AccentKey): Theme {
  const neutrals = isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const accent = accentValue(accentKey);
  return {
    dark: isDark,
    ...neutrals,
    accent,
    accentSoft: hexToRgba(accent, isDark ? 0.22 : 0.16),
    accentText: '#FFFFFF',
    danger: isDark ? '#C97B7B' : '#BD6B6B',
    dangerSoft: hexToRgba(isDark ? '#C97B7B' : '#BD6B6B', isDark ? 0.22 : 0.14),
  };
}
