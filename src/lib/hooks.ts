import { useEffect, useMemo, useState } from 'react';
import { useDb } from '../store/db';
import { useSession } from '../store/session';
import { cartTotals, getCart } from '../services/api';
import { estimateWait, stallLoad, typicalPrep, type StallLoad } from './waitTime';
import type { Stall } from './types';
import type { CategoryId } from '../data/menu';
import { CATEGORY_ORDER } from '../data/menu';

export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export interface StallLive {
  stall: Stall;
  load: StallLoad;
  wait: number | null; // minutes for a typical new order
  typical: number;
}

export function useStallLive(): Record<CategoryId, StallLive> & { list: StallLive[] } {
  const stalls = useDb((s) => s.stalls);
  const orders = useDb((s) => s.orders);
  const items = useDb((s) => s.items);
  const now = useNow(15000);
  return useMemo(() => {
    const itemList = Object.values(items).filter((i) => i.kind === 'food'); // typical wait uses food prep times
    const map = {} as Record<CategoryId, StallLive>;
    for (const id of CATEGORY_ORDER) {
      const stall = stalls[id];
      const load = stallLoad(stall, orders, now);
      const typical = typicalPrep(itemList, id);
      map[id] = { stall, load, typical, wait: estimateWait(stall, load, typical) };
    }
    return Object.assign(map, { list: CATEGORY_ORDER.map((id) => map[id]) });
  }, [stalls, orders, items, now]);
}

export function useCart() {
  const userId = useSession((s) => s.session?.userId);
  const cart = useDb((s) => getCart(s, userId));
  const items = useDb((s) => s.items);
  const totals = useMemo(() => cartTotals({ items } as never, cart), [items, cart]);
  return { userId, cart, ...totals };
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

const loaded = new Set<string>();
/** Brief skeleton on first visit of a screen per session (mirrors a network fetch). */
export function useFirstLoad(key: string, ms = 450) {
  const [loading, setLoading] = useState(!loaded.has(key));
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      loaded.add(key);
      setLoading(false);
    }, ms);
    return () => clearTimeout(t);
  }, [key, ms, loading]);
  return loading;
}

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setR(m.matches);
    const h = () => setR(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return r;
}
