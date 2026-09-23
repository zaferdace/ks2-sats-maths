/** 75_000 → "1:15"; an hour or more → "1:02:03". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Seconds with one decimal below a minute: "42 s", "1 min 5 s". */
export function formatSeconds(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const DATE_TIME = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDate = (ts: number): string => DATE.format(ts);
export const formatDateTime = (ts: number): string => DATE_TIME.format(ts);
