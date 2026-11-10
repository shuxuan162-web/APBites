// Demo-mode "backend" data store.
// Persisted to localStorage and synced across browser tabs (student tab ↔ vendor tab),
// so the full order lifecycle works without a server. All writes go through
// src/services/api.ts, which mirrors what a Supabase/Firebase backend would enforce.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SEED_ITEMS, SEED_STALLS, type CategoryId } from '../data/menu';
import images from '../data/images.json';
import type {
  AppNotification, Cart, MenuItem, Order, OrderItem, OrderStatus, Stall, StatusRecord, SupportRequest, User,
} from '../lib/types';
import { orderPrepMinutes } from '../lib/waitTime';
import { round2, uid } from '../lib/format';

export const DB_KEY = 'apbites-db-v1';
export const DB_VERSION = 5;

const IMG = images as Record<string, { url: string; credit: string }>;
export const imageFor = (id: string) => IMG[id]?.url;

export interface DbState {
  version: number;
  users: User[];
  stalls: Record<CategoryId, Stall>;
  items: Record<string, MenuItem>;
  orders: Order[];
  notifications: AppNotification[];
  favourites: Record<string, string[]>;
  carts: Record<string, Cart>;
  statusHistory: StatusRecord[];
  support: SupportRequest[];
  recentSearches: Record<string, string[]>;
  seq: number;
  updatedAt: number;
  simulation: boolean;
  devUnlocked: boolean;
}

// Demo credentials (SHA-256 hashed). Shown openly on the login screen as demo accounts.
const HASH_STUDENT = 'd5f180114584b62053c4b79f421a82a2376f7d81dfd251b628b90514b03ac0a0'; // apbites123
const HASH_VENDOR = '00fc1e6c602824793c9840e781e5e20747507e26ddf0d60fab996567a0327cdf'; // vendor123

export const DEMO_STUDENT_EMAIL = 'student@mail.apu.edu.my';
export const DEMO_STUDENT_PASSWORD = 'apbites123';
export const DEMO_VENDOR_PASSWORD = 'vendor123';
export const vendorEmail = (id: string) => `${id}.vendor@apbites.demo`;

const SIM_NAMES = ['Hafiz', 'Mei Ling', 'Arjun', 'Sofia', 'Daniel', 'Nurul', 'Kevin', 'Priya', 'Jason', 'Aina', 'Ravi', 'Chloe', 'Imran', 'Wen Hui'];

// Initial digital-order workload per stall (simulated demo traffic).
const INITIAL_ACTIVE: Record<CategoryId, number> = {
  western: 1, korean: 5, chinese: 2, japanese: 4, shawarma: 0, mamak: 9, kopitiam: 4, indian: 3,
};

function pick<T>(arr: T[], r = Math.random()) {
  return arr[Math.floor(r * arr.length) % arr.length];
}

// deterministic PRNG so the seeded history is stable between resets
function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeOrderItems(lines: { item: MenuItem; quantity: number; instructions?: string }[]): OrderItem[] {
  return lines.map(({ item, quantity, instructions }) => ({
    id: uid('oi_'),
    menuItemId: item.id,
    name: item.name,
    unitPrice: item.price,
    quantity,
    instructions: instructions || undefined,
    lineTotal: round2(item.price * quantity),
    prep: item.prep,
  }));
}

export const orderNumber = (seq: number) => `APB-${String(seq).padStart(6, '0')}`;
export const pickupCode = (seq: number) => `${String.fromCharCode(65 + (Math.floor(seq / 1000) % 26))}${String(seq % 1000).padStart(3, '0')}`;

export function buildSimOrder(
  st: { items: Record<string, MenuItem>; stalls: Record<CategoryId, Stall> },
  stallId: CategoryId,
  seq: number,
  status: OrderStatus,
  createdAt: number,
  rand: () => number = Math.random,
): Order {
  const menu = Object.values(st.items).filter((i) => i.stallId === stallId && i.isAvailable && i.kind === 'food');
  const n = 1 + Math.floor(rand() * 2);
  const chosen = Array.from({ length: n }, () => ({ item: pick(menu, rand()), quantity: rand() < 0.8 ? 1 : 2 }));
  const items = makeOrderItems(chosen);
  const subtotal = round2(items.reduce((s, i) => s + i.lineTotal, 0));
  const prep = orderPrepMinutes(items);
  const timeline: Order['timeline'] = { pending: createdAt };
  const flow: OrderStatus[] = ['accepted', 'preparing', 'ready', 'collected'];
  let t = createdAt;
  for (const s of flow) {
    if (status === 'pending' || status === 'cancelled' || status === 'rejected') break;
    t += (s === 'ready' ? prep : 1 + Math.floor(rand() * 2)) * 60000;
    timeline[s] = Math.min(t, Date.now() - 30000);
    if (s === status) break;
  }
  if (status === 'cancelled' || status === 'rejected') timeline[status] = createdAt + 60000;
  return {
    id: uid('ord_'),
    orderNumber: orderNumber(seq),
    pickupCode: pickupCode(seq),
    userId: 'sim',
    customerName: `${pick(SIM_NAMES, rand())} (demo)`,
    stallId,
    stallName: st.stalls[stallId].name,
    status,
    items,
    subtotal,
    serviceFee: 0,
    total: subtotal,
    paymentMethod: rand() < 0.6 ? 'counter' : 'demo_online',
    paymentStatus: 'unpaid',
    pickupType: 'self',
    scheduledPickupAt: null,
    estimatedReadyAt: status === 'pending' ? null : createdAt + (prep + 6) * 60000,
    prepMinutes: prep,
    timeline,
    simulated: true,
    version: 1,
    createdAt,
    updatedAt: createdAt,
  };
}

export function createSeed(): DbState {
  const now = Date.now();
  const stalls = Object.fromEntries(
    SEED_STALLS.map((s) => [
      s.id,
      {
        id: s.id, name: s.name, cuisine: s.cuisine, tagline: s.tagline, description: s.description,
        imageUrl: imageFor(`stall:${s.id}`), hours: s.hours, isOpen: true, acceptingOrders: true,
        capacity: s.capacity, thresholds: s.thresholds, vendorWorkload: null, vendorWorkloadAt: null,
        byoContainer: s.id === 'kopitiam' || s.id === 'mamak', lastStatusUpdated: now, createdAt: now,
      } satisfies Stall,
    ]),
  ) as Record<CategoryId, Stall>;

  const items = Object.fromEntries(
    SEED_ITEMS.map((i) => [
      i.id,
      {
        id: i.id, stallId: i.stallId, kind: i.kind, name: i.name, description: i.description, price: i.price,
        imageUrl: imageFor(i.id), ingredients: i.ingredients, prep: i.prep,
        isAvailable: !['kor-07', 'mam-06', 'jap-10'].includes(i.id), // a few sold-out examples
        createdAt: now, updatedAt: now,
      } satisfies MenuItem,
    ]),
  );

  const users: User[] = [
    {
      id: 'u_student', fullName: 'Alex Tan', email: DEMO_STUDENT_EMAIL, studentId: 'TP071234',
      role: 'student', passwordHash: HASH_STUDENT, isDemo: true, createdAt: now - 30 * 864e5, updatedAt: now,
    },
    ...SEED_STALLS.map((s) => ({
      id: `u_vendor_${s.id}`, fullName: `${s.name} Vendor`, email: vendorEmail(s.id), role: 'vendor' as const,
      stallId: s.id, passwordHash: HASH_VENDOR, isDemo: true, createdAt: now - 60 * 864e5, updatedAt: now,
    })),
  ];

  const base = { items, stalls };
  const rand = mulberry32(2109);
  const orders: Order[] = [];
  let seq = 1;

  // 7 days of simulated history per stall (clearly flagged simulated → shown as demo data)
  for (const s of SEED_STALLS) {
    for (let d = 7; d >= 1; d--) {
      const count = 5 + Math.floor(rand() * 6);
      for (let k = 0; k < count; k++) {
        const hour = rand() < 0.55 ? 11 + Math.floor(rand() * 3) : 8 + Math.floor(rand() * 11);
        const day = new Date(now - d * 864e5);
        day.setHours(hour, Math.floor(rand() * 60), 0, 0);
        const status: OrderStatus = rand() < 0.08 ? 'cancelled' : 'collected';
        const o = buildSimOrder(base, s.id, seq++, status, day.getTime(), rand);
        if (status === 'cancelled') o.cancelReason = 'Cancelled by customer';
        orders.push(o);
      }
    }
  }
  // the demo student's own previous order (so "Order Again" and history are demonstrable)
  {
    const y = new Date(now - 864e5);
    y.setHours(12, 18, 0, 0);
    const o = buildSimOrder(base, 'shawarma', seq++, 'collected', y.getTime(), rand);
    const it = items['sha-01'];
    o.items = makeOrderItems([{ item: it, quantity: 1 }, { item: items['sha-10'], quantity: 1 }]);
    o.subtotal = o.total = round2(o.items.reduce((s, i) => s + i.lineTotal, 0));
    o.prepMinutes = orderPrepMinutes(o.items);
    o.userId = 'u_student';
    o.customerName = 'Alex Tan';
    o.simulated = false;
    orders.push(o);
  }
  // current live workload (simulated)
  for (const s of SEED_STALLS) {
    const n = INITIAL_ACTIVE[s.id];
    for (let k = 0; k < n; k++) {
      const status: OrderStatus = k % 3 === 0 ? 'preparing' : k % 3 === 1 ? 'accepted' : 'pending';
      const created = now - (2 + Math.floor(rand() * 8)) * 60000;
      const o = buildSimOrder(base, s.id, seq++, status, created, rand);
      if (status === 'preparing') o.timeline.preparing = now - Math.floor(rand() * 3) * 60000;
      orders.push(o);
    }
  }
  // move global numbering so the first real order is APB-000128-ish
  seq = Math.max(seq, 128);

  return {
    version: DB_VERSION,
    users,
    stalls,
    items,
    orders,
    notifications: [],
    favourites: { u_student: ['wes-03', 'kop-03', 'kor-01'] },
    carts: {},
    statusHistory: [],
    support: [],
    recentSearches: {},
    seq,
    updatedAt: now,
    simulation: false,
    devUnlocked: false,
  };
}

export const useDb = create<DbState>()(
  persist(() => createSeed(), {
    name: DB_KEY,
    version: DB_VERSION,
    storage: createJSONStorage(() => localStorage),
    migrate: () => createSeed() as unknown as DbState,
  }),
);

/** Apply a mutation and bump the global updatedAt (drives freshness indicators). */
export function mutate(fn: (s: DbState) => Partial<DbState>) {
  useDb.setState((s) => ({ ...fn(s), updatedAt: Date.now() }));
}

export function resetDemo() {
  const keepDev = useDb.getState().devUnlocked;
  useDb.setState({ ...createSeed(), devUnlocked: keepDev }, true);
}

// Realtime: another tab wrote to the store → pull the new state.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) useDb.persist.rehydrate();
  });
}
