export { clock, rm, timeAgo } from '../../lib/format';

export function describeAge(ts: number, now = Date.now()) {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
