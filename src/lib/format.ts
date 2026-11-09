export const rm = (n: number) => `RM ${n.toFixed(2)}`;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const uid = (p = '') =>
  p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit', hour12: true });

export const dateShort = (ts: number) =>
  new Date(ts).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });

export const dateTime = (ts: number) => `${dateShort(ts)}, ${clock(ts)}`;

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] || full;

export const initials = (full: string) =>
  full
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export const minutesLabel = (m: number) => `${m} min`;

/** Displayed as a friendly range, e.g. 10–15 min. */
export function waitRange(m: number | null) {
  if (m == null) return '—';
  if (m < 5) return `${Math.max(1, m)}–5 min`;
  const lo = Math.floor(m / 5) * 5;
  return `${lo}–${lo + 5} min`;
}

export function hhmmToday(hhmm: string, base = new Date()) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  );
}

export const isApuEmail = (email: string) => /^[^\s@]+@([a-z0-9-]+\.)*apu\.edu\.my$/i.test(email.trim());
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
