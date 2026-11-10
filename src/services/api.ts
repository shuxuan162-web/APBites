// APBites service layer — DEMO MODE implementation.
// Every function here is what a real backend endpoint / RLS policy would enforce:
// role checks, stall ownership, server-side price recalculation, valid status transitions,
// optimistic-concurrency versioning and duplicate-submission protection.
// Swap these bodies for Supabase calls later without touching the UI.
import { normaliseItemName, type CategoryId, type ItemKind } from '../data/menu';
import { useDb, mutate, makeOrderItems, orderNumber, pickupCode, buildSimOrder, resetDemo, type DbState } from '../store/db';
import type {
  AppNotification, Cart, MenuItem, NotificationType, Order, OrderStatus, PaymentMethod, Result, Stall, User,
} from '../lib/types';
import { round2, sha256, uid, isApuEmail, isEmail, clock, hhmmToday } from '../lib/format';
import { estimateWait, orderPrepMinutes, stallLoad } from '../lib/waitTime';

const LATENCY = 350;
const delay = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));
const ok = <T>(data: T): Result<T> => ({ ok: true, data });
const fail = (error: string, code?: string): Result<never> => ({ ok: false, error, code });
const S = () => useDb.getState();

function offline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
const OFFLINE_MSG = "You're offline. Reconnect to the internet and try again.";

// ── auth ────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<Result<User>> {
  await delay();
  if (offline()) return fail(OFFLINE_MSG);
  const user = S().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const hash = await sha256(password);
  if (!user || user.passwordHash !== hash) return fail('Incorrect email or password. Please try again.');
  return ok(user);
}

export async function register(input: {
  fullName: string; email: string; studentId?: string; password: string;
}): Promise<Result<User>> {
  await delay(500);
  if (offline()) return fail(OFFLINE_MSG);
  const email = input.email.trim().toLowerCase();
  if (!isApuEmail(email)) return fail('Please use your APU email address (ending in apu.edu.my).');
  if (S().users.some((u) => u.email.toLowerCase() === email)) return fail('An account with this email already exists. Try signing in.');
  const now = Date.now();
  const user: User = {
    id: uid('u_'), fullName: input.fullName.trim(), email, studentId: input.studentId?.trim() || undefined,
    role: 'student', passwordHash: await sha256(input.password), createdAt: now, updatedAt: now,
  };
  mutate((s) => ({ users: [...s.users, user] }));
  return ok(user);
}

export async function requestPasswordReset(email: string): Promise<Result<string>> {
  await delay();
  if (!isEmail(email)) return fail('Enter a valid email address.');
  return ok('Password reset emails are not connected in demo mode. Use a demo account or create a new one.');
}

export async function updateProfile(userId: string, patch: { fullName: string; studentId?: string; avatarUrl?: string }): Promise<Result<User>> {
  await delay();
  if (offline()) return fail(OFFLINE_MSG);
  if (!patch.fullName.trim()) return fail('Full name is required.');
  let updated: User | undefined;
  mutate((s) => ({
    users: s.users.map((u) => {
      if (u.id !== userId) return u;
      updated = { ...u, fullName: patch.fullName.trim(), studentId: patch.studentId?.trim() || undefined, avatarUrl: patch.avatarUrl, updatedAt: Date.now() };
      return updated;
    }),
  }));
  return updated ? ok(updated) : fail('We could not find your account. Please sign in again.');
}

// ── notifications ───────────────────────────────────────────
function notify(s: DbState, userId: string, type: NotificationType, title: string, message: string, orderId?: string): AppNotification[] {
  if (userId === 'sim') return s.notifications;
  const n: AppNotification = { id: uid('n_'), userId, orderId, type, title, message, isRead: false, createdAt: Date.now() };
  return [n, ...s.notifications].slice(0, 200);
}

export function markRead(userId: string, id?: string) {
  mutate((s) => ({
    notifications: s.notifications.map((n) => (n.userId === userId && (!id || n.id === id) ? { ...n, isRead: true } : n)),
  }));
}

// ── cart ────────────────────────────────────────────────────
const emptyCart: Cart = { stallId: null, lines: [] };
export const getCart = (s: DbState, userId: string | null | undefined): Cart => (userId && s.carts[userId]) || emptyCart;

function setCart(userId: string, cart: Cart) {
  mutate((s) => ({ carts: { ...s.carts, [userId]: cart.lines.length ? cart : emptyCart } }));
}

export function addToCart(
  userId: string, itemId: string, quantity = 1, instructions = '', replace = false,
): Result<'added'> {
  const s = S();
  const item = s.items[itemId];
  if (!item) return fail('This item is no longer on the menu.');
  if (!item.isAvailable) return fail(`${item.name} is sold out right now.`, 'SOLD_OUT');
  const stall = s.stalls[item.stallId];
  if (!stall.isOpen) return fail(`${stall.name} is closed right now.`, 'CLOSED');
  const cart = getCart(s, userId);
  if (cart.stallId && cart.stallId !== item.stallId && cart.lines.length && !replace) {
    return fail(`Your cart has items from ${s.stalls[cart.stallId].name}.`, 'DIFFERENT_STALL');
  }
  const base = cart.stallId === item.stallId ? cart.lines : [];
  const instr = instructions.trim().slice(0, 200);
  const existing = base.find((l) => l.menuItemId === itemId && l.instructions === instr);
  const lines = existing
    ? base.map((l) => (l === existing ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l))
    : [...base, { key: uid('l_'), menuItemId: itemId, quantity: Math.min(20, quantity), instructions: instr }];
  setCart(userId, { stallId: item.stallId, lines });
  return ok('added');
}

export function setLineQty(userId: string, key: string, quantity: number) {
  const cart = getCart(S(), userId);
  const lines = cart.lines
    .map((l) => (l.key === key ? { ...l, quantity: Math.max(0, Math.min(20, quantity)) } : l))
    .filter((l) => l.quantity > 0);
  setCart(userId, { stallId: lines.length ? cart.stallId : null, lines });
}

export const removeLine = (userId: string, key: string) => setLineQty(userId, key, 0);
export const clearCart = (userId: string) => setCart(userId, emptyCart);

export function cartTotals(s: DbState, cart: Cart) {
  const lines = cart.lines
    .map((l) => ({ line: l, item: s.items[l.menuItemId] }))
    .filter((x): x is { line: typeof x.line; item: MenuItem } => !!x.item);
  const subtotal = round2(lines.reduce((t, x) => t + x.item.price * x.line.quantity, 0));
  const count = lines.reduce((t, x) => t + x.line.quantity, 0);
  return { lines, subtotal, serviceFee: 0, total: subtotal, count };
}

// ── favourites & searches ───────────────────────────────────
export function toggleFavourite(userId: string, itemId: string): boolean {
  const cur = S().favourites[userId] ?? [];
  const has = cur.includes(itemId);
  mutate((s) => ({ favourites: { ...s.favourites, [userId]: has ? cur.filter((i) => i !== itemId) : [itemId, ...cur] } }));
  return !has;
}

export function addRecentSearch(userId: string, q: string) {
  const term = q.trim();
  if (term.length < 2) return;
  mutate((s) => {
    const cur = (s.recentSearches[userId] ?? []).filter((t) => t.toLowerCase() !== term.toLowerCase());
    return { recentSearches: { ...s.recentSearches, [userId]: [term, ...cur].slice(0, 6) } };
  });
}
export const clearRecentSearches = (userId: string) => mutate((s) => ({ recentSearches: { ...s.recentSearches, [userId]: [] } }));

// ── status history (data_source kept explicit) ──────────────
function snapshot(s: DbState, stallId: CategoryId, orders: Order[], stalls = s.stalls): DbState['statusHistory'] {
  const stall = stalls[stallId];
  const load = stallLoad(stall, orders);
  const prep = 8;
  const rec = {
    id: uid('sh_'), stallId, activeOrders: load.active, waitMinutes: estimateWait(stall, load, prep),
    level: load.level, source: load.source, recordedAt: Date.now(),
  };
  return [...s.statusHistory, rec].slice(-500);
}

// ── scheduled pickup slots ──────────────────────────────────
export function pickupSlots(stall: Stall, minLeadMinutes: number, now = Date.now()) {
  const slots: number[] = [];
  for (let day = 0; day < 2; day++) {
    const base = new Date(now + day * 864e5);
    const open = hhmmToday(stall.hours.open, base);
    const close = hhmmToday(stall.hours.close, base);
    let t = Math.max(open, now + minLeadMinutes * 60000);
    t = Math.ceil(t / (15 * 60000)) * 15 * 60000;
    for (; t <= close - 15 * 60000; t += 15 * 60000) slots.push(t);
  }
  return slots.slice(0, 40);
}

// ── orders ──────────────────────────────────────────────────
const inflight = new Set<string>();

export async function placeOrder(
  userId: string,
  opts: { paymentMethod: PaymentMethod; scheduledAt: number | null; expectedTotal: number },
): Promise<Result<Order>> {
  if (inflight.has(userId)) return fail('Your order is already being submitted.', 'DUPLICATE');
  inflight.add(userId);
  try {
    await delay(700);
    if (offline()) return fail(OFFLINE_MSG, 'OFFLINE');
    const s = S();
    const user = s.users.find((u) => u.id === userId);
    if (!user) return fail('Your session has ended. Please sign in again.', 'AUTH');
    if (user.role !== 'student') return fail('Only student accounts can place orders.', 'AUTH');
    const cart = getCart(s, userId);
    if (!cart.stallId || !cart.lines.length) return fail('Your cart is empty.', 'EMPTY');
    const stall = s.stalls[cart.stallId];
    if (!stall.isOpen) return fail(`${stall.name} is closed right now, so it can't take new orders.`, 'CLOSED');
    if (!stall.acceptingOrders) return fail(`${stall.name} has paused new orders for the moment. Try again shortly or pick another stall.`, 'PAUSED');

    const unavailable = cart.lines.filter((l) => !s.items[l.menuItemId]?.isAvailable).map((l) => s.items[l.menuItemId]?.name ?? 'An item');
    if (unavailable.length) return fail(`${unavailable.join(', ')} ${unavailable.length > 1 ? 'are' : 'is'} sold out. Remove ${unavailable.length > 1 ? 'them' : 'it'} to continue.`, 'SOLD_OUT');

    // server-side price recalculation — never trust the client total
    const items = makeOrderItems(cart.lines.map((l) => ({ item: s.items[l.menuItemId], quantity: l.quantity, instructions: l.instructions })));
    const subtotal = round2(items.reduce((t, i) => t + i.lineTotal, 0));
    const total = subtotal;
    if (Math.abs(total - opts.expectedTotal) > 0.001) {
      return fail(`Prices were updated by the stall. Your new total is RM ${total.toFixed(2)} — please review and place the order again.`, 'PRICE_CHANGED');
    }
    const prep = orderPrepMinutes(items);
    if (opts.scheduledAt != null) {
      const valid = pickupSlots(stall, prep).includes(opts.scheduledAt);
      if (!valid) return fail('That pickup time is no longer available. Please choose another time.', 'SLOT');
    }

    const now = Date.now();
    const seq = s.seq + 1;
    const order: Order = {
      id: uid('ord_'), orderNumber: orderNumber(seq), pickupCode: pickupCode(seq), userId, customerName: user.fullName,
      stallId: stall.id, stallName: stall.name, status: 'pending', items, subtotal, serviceFee: 0, total,
      paymentMethod: opts.paymentMethod, paymentStatus: opts.paymentMethod === 'demo_online' ? 'paid_demo' : 'unpaid',
      pickupType: 'self', scheduledPickupAt: opts.scheduledAt, estimatedReadyAt: null, prepMinutes: prep,
      timeline: { pending: now }, simulated: false, version: 1, createdAt: now, updatedAt: now,
    };
    mutate((st) => {
      const orders = [...st.orders, order];
      return {
        orders, seq,
        carts: { ...st.carts, [userId]: emptyCart },
        statusHistory: snapshot(st, stall.id, orders),
      };
    });
    return ok(order);
  } finally {
    inflight.delete(userId);
  }
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['collected'],
  collected: [],
  cancelled: [],
  rejected: [],
};

const NOTE: Partial<Record<OrderStatus, { type: NotificationType; title: string; msg: (o: Order) => string }>> = {
  accepted: { type: 'order_accepted', title: 'Order Accepted', msg: (o) => `${o.stallName} accepted order ${o.orderNumber}.` },
  preparing: { type: 'order_preparing', title: 'Your Food Is Being Prepared', msg: (o) => `${o.stallName} has started preparing ${o.items[0].name}${o.items.length > 1 ? ' and more' : ''}.` },
  ready: { type: 'order_ready', title: 'Your Food Is Ready!', msg: (o) => `Your ${o.items[0].name}${o.items.length > 1 ? ' and more' : ''} from ${o.stallName} is ready for collection. Pickup code ${o.pickupCode}.` },
  collected: { type: 'order_collected', title: 'Order Collected', msg: (o) => `Enjoy your meal! Order ${o.orderNumber} is complete.` },
  rejected: { type: 'order_rejected', title: 'Order Not Accepted', msg: (o) => `${o.stallName} couldn't accept order ${o.orderNumber}${o.cancelReason ? `: ${o.cancelReason}` : '.'}` },
  cancelled: { type: 'order_cancelled', title: 'Order Cancelled', msg: (o) => `Order ${o.orderNumber} was cancelled${o.cancelReason ? `: ${o.cancelReason}` : '.'}` },
};

function applyTransition(o: Order, to: OrderStatus, s: DbState, reason?: string): Order {
  const now = Date.now();
  const next: Order = { ...o, status: to, timeline: { ...o.timeline, [to]: now }, version: o.version + 1, updatedAt: now };
  if (reason) next.cancelReason = reason;
  const stall = s.stalls[o.stallId];
  if (to === 'accepted') {
    const others = s.orders.filter((x) => x.id !== o.id);
    const load = stallLoad(stall, others, now);
    const eta = now + Math.round(load.queueMinutes + o.prepMinutes) * 60000;
    next.estimatedReadyAt = o.scheduledPickupAt ? Math.max(o.scheduledPickupAt, eta) : eta;
  }
  if (to === 'preparing') next.estimatedReadyAt = Math.max(o.estimatedReadyAt ?? 0, now + o.prepMinutes * 60000);
  if (to === 'ready') next.estimatedReadyAt = now;
  if ((to === 'cancelled' || to === 'rejected') && o.paymentStatus === 'paid_demo') next.paymentStatus = 'refunded_demo';
  return next;
}

function commit(orderId: string, to: OrderStatus, reason?: string) {
  mutate((s) => {
    const o = s.orders.find((x) => x.id === orderId)!;
    const next = applyTransition(o, to, s, reason);
    const orders = s.orders.map((x) => (x.id === orderId ? next : x));
    const n = NOTE[to];
    return {
      orders,
      notifications: n ? notify(s, o.userId, n.type, n.title, n.msg(next), o.id) : s.notifications,
      statusHistory: snapshot(s, o.stallId, orders),
    };
  });
  return S().orders.find((x) => x.id === orderId)!;
}

export async function vendorUpdateOrder(
  vendorId: string, orderId: string, to: OrderStatus, expectedVersion: number, opts: { reason?: string; code?: string } = {},
): Promise<Result<Order>> {
  await delay(250);
  if (offline()) return fail("You're offline. The order status wasn't changed — reconnect and try again.", 'OFFLINE');
  const s = S();
  const vendor = s.users.find((u) => u.id === vendorId);
  const o = s.orders.find((x) => x.id === orderId);
  if (!vendor || (vendor.role !== 'vendor' && vendor.role !== 'admin')) return fail('Only stall vendors can update orders.', 'AUTH');
  if (!o) return fail('This order no longer exists.');
  if (vendor.role === 'vendor' && vendor.stallId !== o.stallId) return fail("You can only manage your own stall's orders.", 'AUTH');
  if (o.version !== expectedVersion) return fail('This order was just updated elsewhere. We refreshed it — please check and try again.', 'CONFLICT');
  if (!TRANSITIONS[o.status].includes(to)) return fail(`An order that is ${o.status} can't be moved to ${to}.`, 'INVALID');
  if (to === 'collected' && opts.code?.trim().toUpperCase() !== o.pickupCode) return fail("That pickup code doesn't match this order.", 'CODE');
  return ok(commit(orderId, to, opts.reason));
}

export async function cancelOrder(userId: string, orderId: string): Promise<Result<Order>> {
  await delay();
  if (offline()) return fail(OFFLINE_MSG);
  const o = S().orders.find((x) => x.id === orderId);
  if (!o || o.userId !== userId) return fail('Order not found.');
  if (o.status !== 'pending') return fail('This order has already been accepted by the stall and can no longer be cancelled in the app. Please speak to the stall.', 'INELIGIBLE');
  return ok(commit(orderId, 'cancelled', 'Cancelled by you'));
}

export function canStudentCancel(o: Order) {
  return o.status === 'pending';
}

export async function submitFeedback(userId: string, orderId: string, f: { food: number; wait: number; overall: number }): Promise<Result<void>> {
  await delay();
  const o = S().orders.find((x) => x.id === orderId);
  if (!o || o.userId !== userId || o.status !== 'collected') return fail('Feedback is available for collected orders only.');
  mutate((s) => ({ orders: s.orders.map((x) => (x.id === orderId ? { ...x, feedback: { ...f, at: Date.now() } } : x)) }));
  return ok(undefined);
}

/** Rebuild a cart from a past order using CURRENT availability and prices. */
export function reorder(userId: string, orderId: string, replace = false): Result<{ added: number; unavailable: string[]; priceChanged: string[] }> {
  const s = S();
  const o = s.orders.find((x) => x.id === orderId && x.userId === userId);
  if (!o) return fail('Order not found.');
  const stall = s.stalls[o.stallId];
  if (!stall.isOpen) return fail(`${stall.name} is closed right now.`, 'CLOSED');
  const cart = getCart(s, userId);
  if (cart.lines.length && cart.stallId !== o.stallId && !replace) return fail(`Your cart has items from ${s.stalls[cart.stallId!].name}.`, 'DIFFERENT_STALL');
  const unavailable: string[] = [];
  const priceChanged: string[] = [];
  const lines = o.items.flatMap((it) => {
    const cur = s.items[it.menuItemId];
    if (!cur || !cur.isAvailable) {
      unavailable.push(it.name);
      return [];
    }
    if (Math.abs(cur.price - it.unitPrice) > 0.001) priceChanged.push(`${cur.name} is now RM ${cur.price.toFixed(2)}`);
    return [{ key: uid('l_'), menuItemId: cur.id, quantity: it.quantity, instructions: it.instructions ?? '' }];
  });
  if (!lines.length) return fail(`${unavailable.join(', ')} ${unavailable.length > 1 ? 'are' : 'is'} unavailable right now.`, 'SOLD_OUT');
  const base = cart.stallId === o.stallId ? cart.lines : [];
  setCart(userId, { stallId: o.stallId, lines: [...base, ...lines] });
  return ok({ added: lines.length, unavailable, priceChanged });
}

// ── vendor: stall & menu ────────────────────────────────────
function vendorStall(vendorId: string): Result<CategoryId> {
  const v = S().users.find((u) => u.id === vendorId);
  if (!v || v.role !== 'vendor' || !v.stallId) return fail('Vendor access required.', 'AUTH');
  return ok(v.stallId);
}

export async function updateStall(vendorId: string, patch: Partial<Pick<Stall, 'isOpen' | 'acceptingOrders' | 'capacity' | 'vendorWorkload' | 'thresholds' | 'byoContainer'>>): Promise<Result<Stall>> {
  await delay(200);
  if (offline()) return fail("You're offline. Your stall settings weren't saved.");
  const r = vendorStall(vendorId);
  if (!r.ok) return r;
  if (patch.capacity != null && (patch.capacity < 1 || patch.capacity > 10 || !Number.isInteger(patch.capacity))) return fail('Preparation stations must be a whole number from 1 to 10.');
  if (patch.thresholds && (patch.thresholds.moderate < 1 || patch.thresholds.high <= patch.thresholds.moderate)) return fail('The high threshold must be greater than the moderate threshold.');
  const id = r.data;
  mutate((s) => {
    const prev = s.stalls[id];
    const now = Date.now();
    const next: Stall = {
      ...prev, ...patch, lastStatusUpdated: now,
      vendorWorkloadAt: 'vendorWorkload' in patch ? (patch.vendorWorkload ? now : null) : prev.vendorWorkloadAt,
    };
    const stalls = { ...s.stalls, [id]: next };
    let notifications = s.notifications;
    if (prev.isOpen && patch.isOpen === false) {
      const affected = new Set(s.orders.filter((o) => o.stallId === id && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).map((o) => o.userId));
      for (const u of affected) notifications = notify({ ...s, notifications }, u, 'stall_closed', 'Stall Temporarily Closed', `${prev.name} has closed for now. Your existing order is still being handled — check its status in Orders.`);
    }
    return { stalls, notifications, statusHistory: snapshot(s, id, s.orders, stalls) };
  });
  return ok(S().stalls[id]);
}

export async function upsertItem(vendorId: string, input: Omit<MenuItem, 'createdAt' | 'updatedAt' | 'stallId' | 'id'> & { id?: string }): Promise<Result<MenuItem>> {
  await delay();
  if (offline()) return fail("You're offline. The menu wasn't changed.");
  const r = vendorStall(vendorId);
  if (!r.ok) return r;
  if (!input.name.trim()) return fail(input.kind === 'drink' ? 'Drink name is required.' : 'Food name is required.', 'NAME');
  if (!(input.price >= 0)) return fail('Price must be zero or more.');
  if (!(input.prep > 0)) return fail('Preparation time must be greater than zero.');
  const now = Date.now();
  const existing = input.id ? S().items[input.id] : undefined;
  if (existing && existing.stallId !== r.data) return fail("You can only edit your own stall's menu.", 'AUTH');
  if (input.kind === 'drink') {
    const clash = drinkNameClash(input.name, r.data);
    if (clash) return fail(`"${clash.name}" is already sold at ${S().stalls[clash.stallId].name}. Each drink must be unique to one stall — try a different name.`, 'DUPLICATE_DRINK');
  }
  const item: MenuItem = {
    ...(existing ?? { createdAt: now }),
    id: existing?.id ?? uid(`${r.data.slice(0, 3)}-`),
    stallId: r.data, kind: input.kind, name: input.name.trim(), description: input.description.trim(), price: round2(input.price),
    imageUrl: input.imageUrl || existing?.imageUrl, ingredients: input.ingredients?.length ? input.ingredients : undefined,
    prep: Math.round(input.prep), isAvailable: input.isAvailable, updatedAt: now,
  } as MenuItem;
  mutate((s) => ({ items: { ...s.items, [item.id]: item } }));
  return ok(item);
}

/** A drink at ANOTHER stall whose normalised name matches `name` (drinks must be unique per stall). */
export function drinkNameClash(name: string, ownStallId: CategoryId): MenuItem | undefined {
  const key = normaliseItemName(name);
  if (!key) return undefined;
  return Object.values(S().items).find((i) => i.kind === 'drink' && i.stallId !== ownStallId && normaliseItemName(i.name) === key);
}

export type { ItemKind };

export async function setAvailability(vendorId: string, itemId: string, isAvailable: boolean): Promise<Result<void>> {
  const r = vendorStall(vendorId);
  if (!r.ok) return r;
  const item = S().items[itemId];
  if (!item || item.stallId !== r.data) return fail("You can only edit your own stall's menu.");
  mutate((s) => ({ items: { ...s.items, [itemId]: { ...item, isAvailable, updatedAt: Date.now() } } }));
  return ok(undefined);
}

export async function deleteItem(vendorId: string, itemId: string): Promise<Result<void>> {
  await delay();
  const r = vendorStall(vendorId);
  if (!r.ok) return r;
  const item = S().items[itemId];
  if (!item || item.stallId !== r.data) return fail("You can only delete your own stall's items.");
  mutate((s) => {
    const items = { ...s.items };
    delete items[itemId];
    const carts = Object.fromEntries(
      Object.entries(s.carts).map(([u, c]) => {
        const lines = c.lines.filter((l) => l.menuItemId !== itemId);
        return [u, lines.length ? { ...c, lines } : emptyCart];
      }),
    );
    const favourites = Object.fromEntries(Object.entries(s.favourites).map(([u, f]) => [u, f.filter((i) => i !== itemId)]));
    return { items, carts, favourites };
  });
  return ok(undefined);
}

// ── support ─────────────────────────────────────────────────
export async function submitSupport(userId: string, input: { subject: string; message: string; orderNumber?: string }): Promise<Result<string>> {
  await delay(500);
  if (offline()) return fail(OFFLINE_MSG);
  if (!input.subject.trim() || input.message.trim().length < 10) return fail('Please add a subject and a message of at least 10 characters.');
  const id = uid('sup_');
  mutate((s) => ({ support: [...s.support, { id, userId, ...input, createdAt: Date.now() }] }));
  return ok(id);
}

// ── developer / demo controls ───────────────────────────────
export function generateTraffic(stallId: CategoryId | 'all', n: number) {
  mutate((s) => {
    let seq = s.seq;
    const ids = stallId === 'all' ? (Object.keys(s.stalls) as CategoryId[]) : [stallId];
    const added: Order[] = [];
    for (let i = 0; i < n; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      if (!s.stalls[id].isOpen) continue;
      added.push(buildSimOrder(s, id, ++seq, 'pending', Date.now()));
    }
    const orders = [...s.orders, ...added];
    let statusHistory = s.statusHistory;
    for (const id of new Set(added.map((o) => o.stallId))) statusHistory = snapshot({ ...s, statusHistory }, id, orders);
    return { orders, seq, statusHistory };
  });
}

export function clearSimulatedActive(stallId: CategoryId | 'all') {
  mutate((s) => ({
    orders: s.orders.map((o) =>
      o.simulated && (stallId === 'all' || o.stallId === stallId) && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)
        ? { ...o, status: 'collected' as const, timeline: { ...o.timeline, collected: Date.now() }, version: o.version + 1 }
        : o,
    ),
  }));
}

/** Advance simulated orders one step (used by the optional auto-simulation ticker). */
export function tickSimulation() {
  const s = S();
  const now = Date.now();
  const next: Partial<Record<string, OrderStatus>> = {};
  for (const o of s.orders) {
    if (!o.simulated) continue;
    const since = (now - o.updatedAt) / 60000;
    if (o.status === 'pending' && since > 0.5 && Math.random() < 0.6) next[o.id] = 'accepted';
    else if (o.status === 'accepted' && since > 0.5 && Math.random() < 0.5) next[o.id] = 'preparing';
    else if (o.status === 'preparing' && since > Math.min(2, o.prepMinutes / 3) && Math.random() < 0.5) next[o.id] = 'ready';
    else if (o.status === 'ready' && since > 0.5 && Math.random() < 0.7) next[o.id] = 'collected';
  }
  if (Object.keys(next).length) {
    mutate((st) => ({
      orders: st.orders.map((o) => (next[o.id] ? applyTransition(o, next[o.id]!, st) : o)),
    }));
  }
  if (Math.random() < 0.6) generateTraffic('all', 1 + Math.floor(Math.random() * 2));
}

export const setSimulation = (on: boolean) => mutate(() => ({ simulation: on }));
export const unlockDev = () => mutate(() => ({ devUnlocked: true }));
export { resetDemo };

export const describeSchedule = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return `${isToday ? 'Today' : 'Tomorrow'}, ${clock(ts)}`;
};
