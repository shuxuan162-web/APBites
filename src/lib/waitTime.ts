// APBites order-workload & estimated-wait engine (hackathon MVP).
//
// Estimated wait (new order) = queued workload / parallel prep stations
//                              + remaining time of orders already cooking / stations
//                              + this order's own prep time
//
// It measures DIGITAL ORDER WORKLOAD, not physical crowd density.
// Thresholds and capacity are configurable per stall by the vendor.

import type { Order, OrderItem, Stall, WorkloadLevel, DataSource } from './types';

export const ACTIVE: Order['status'][] = ['pending', 'accepted', 'preparing'];
const VENDOR_REPORT_TTL = 30 * 60 * 1000;

/** Prep minutes for one order: longest dish, plus a share of the rest (cooked in parallel on the same station). */
export function orderPrepMinutes(items: Pick<OrderItem, 'prep' | 'quantity'>[]) {
  if (!items.length) return 0;
  const units = items.flatMap((i) => Array.from({ length: i.quantity }, () => i.prep));
  const max = Math.max(...units);
  const rest = units.reduce((a, b) => a + b, 0) - max;
  return Math.round(max + rest * 0.35);
}

export interface StallLoad {
  active: number;
  pending: number;
  accepted: number;
  preparing: number;
  ready: number;
  simulatedActive: number;
  queueMinutes: number; // time before a new order can start
  orderLevel: WorkloadLevel; // from digital orders
  level: WorkloadLevel; // effective (vendor report wins while fresh)
  source: DataSource;
  vendorReported: WorkloadLevel | null;
}

export function levelFromCount(n: number, t: Stall['thresholds']): WorkloadLevel {
  if (n >= t.high) return 'high';
  if (n >= t.moderate) return 'moderate';
  return 'low';
}

export function stallLoad(stall: Stall, orders: Order[], now = Date.now()): StallLoad {
  const mine = orders.filter((o) => o.stallId === stall.id);
  const act = mine.filter((o) => ACTIVE.includes(o.status));
  const queued = act.filter((o) => o.status !== 'preparing');
  const cooking = act.filter((o) => o.status === 'preparing');

  const queuedWork = queued.reduce((s, o) => s + o.prepMinutes, 0);
  const cookingRemaining = cooking.reduce((s, o) => {
    const started = o.timeline.preparing ?? now;
    const elapsed = (now - started) / 60000;
    return s + Math.max(1, o.prepMinutes - elapsed);
  }, 0);
  const cap = Math.max(1, stall.capacity);
  const queueMinutes = (queuedWork + cookingRemaining) / cap;

  const orderLevel = levelFromCount(act.length, stall.thresholds);
  const vendorFresh =
    stall.vendorWorkload && stall.vendorWorkloadAt && now - stall.vendorWorkloadAt < VENDOR_REPORT_TTL
      ? stall.vendorWorkload
      : null;

  return {
    active: act.length,
    pending: act.filter((o) => o.status === 'pending').length,
    accepted: act.filter((o) => o.status === 'accepted').length,
    preparing: cooking.length,
    ready: mine.filter((o) => o.status === 'ready').length,
    simulatedActive: act.filter((o) => o.simulated).length,
    queueMinutes,
    orderLevel,
    level: vendorFresh ?? orderLevel,
    source: vendorFresh ? 'vendor_report' : 'order_estimate',
    vendorReported: vendorFresh,
  };
}

/** Estimated minutes until a new order with `prep` minutes of cooking would be ready. null when closed. */
export function estimateWait(stall: Stall, load: StallLoad, prep: number): number | null {
  if (!stall.isOpen || !stall.acceptingOrders) return null;
  return Math.max(1, Math.round(load.queueMinutes + prep));
}

export function typicalPrep(items: { prep: number; isAvailable: boolean; stallId: string }[], stallId: string) {
  const list = items.filter((i) => i.stallId === stallId && i.isAvailable);
  if (!list.length) return 8;
  return Math.round(list.reduce((s, i) => s + i.prep, 0) / list.length);
}

export const LEVEL_META: Record<WorkloadLevel, { label: string; short: string; tone: 'ok' | 'warn' | 'bad' }> = {
  low: { label: 'Low Crowd', short: 'Low', tone: 'ok' },
  moderate: { label: 'Moderate Crowd', short: 'Moderate', tone: 'warn' },
  high: { label: 'High Crowd', short: 'High', tone: 'bad' },
};

export function overallLevel(levels: WorkloadLevel[]): WorkloadLevel {
  if (!levels.length) return 'low';
  const score = levels.reduce((s, l) => s + (l === 'high' ? 2 : l === 'moderate' ? 1 : 0), 0) / levels.length;
  if (score >= 1.2) return 'high';
  if (score >= 0.5) return 'moderate';
  return 'low';
}
