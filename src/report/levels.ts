import type { Tally } from '../stats/stats';

/** Accuracy bands. They mean good → bad, so they wear the status colours plus an icon and a label. */
export type Level = 'good' | 'warning' | 'serious' | 'critical' | 'none';

export interface LevelStyle {
  label: string;
  short: string;
  icon: string;
  color: string; // full status colour: small marks, icons
  wash: string; // 20% status colour on white: large tiles
  ink: string; // text on the full colour
}

export const LEVELS: Record<Level, LevelStyle> = {
  good: { label: 'Secure: 85% or more', short: 'Secure', icon: '✓', color: '#0ca30c', wash: '#ceecce', ink: '#0b0b0b' },
  warning: {
    label: 'Nearly there: 70–84%',
    short: 'Nearly there',
    icon: '◐',
    color: '#fab219',
    wash: '#fef0d1',
    ink: '#0b0b0b',
  },
  serious: {
    label: 'Needs practice: 50–69%',
    short: 'Needs practice',
    icon: '!',
    color: '#ec835a',
    wash: '#fbe6de',
    ink: '#0b0b0b',
  },
  critical: { label: 'Weak: below 50%', short: 'Weak', icon: '✕', color: '#d03b3b', wash: '#f6d8d8', ink: '#ffffff' },
  none: { label: 'Not tried yet', short: 'Not tried', icon: '–', color: '#e1e0d9', wash: '#f3f2ee', ink: '#52514e' },
};

export const LEVEL_ORDER: Level[] = ['good', 'warning', 'serious', 'critical', 'none'];

/** Fewer answers than this and a cell is shown faded: too little evidence to judge. */
export const LOW_DATA = 3;

/** The band of a tally, judged on the whole percentage that is printed with it (11/13 shows 85%: Secure). */
export function levelOf(t: Tally): Level {
  if (!t.total) return 'none';
  const pct = Math.round((t.correct / t.total) * 100);
  if (pct >= 85) return 'good';
  if (pct >= 70) return 'warning';
  if (pct >= 50) return 'serious';
  return 'critical';
}

export const pctText = (t: Tally): string => (t.total ? `${Math.round((t.correct / t.total) * 100)}%` : '–');
