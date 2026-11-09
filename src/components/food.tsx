import { create } from 'zustand';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Clock, Heart, Plus, Receipt, ShoppingBag, Store, Trash2 } from 'lucide-react';
import { useDb } from '../store/db';
import { toast, useCartBump, useCurrentUser } from '../store/session';
import { addToCart, removeLine, setLineQty, toggleFavourite } from '../services/api';
import type { MenuItem, Order, OrderStatus, CartLine } from '../lib/types';
import type { CategoryId } from '../data/menu';
import { rm, waitRange, clock, dateTime } from '../lib/format';
import type { StallLive } from '../lib/hooks';
import { Badge, ConfirmationModal, Img, LevelBadge, OpenBadge, OrderStatusBadge, QuantitySelector, cx, Button, DemoTag } from './ui';

// ── category signature images ───────────────────────────────
export const CATEGORY_SIGNATURE: Record<CategoryId, string> = {
  western: 'wes-03', korean: 'kor-01', chinese: 'chi-03', japanese: 'jap-04',
  shawarma: 'sha-01', mamak: 'mam-01', kopitiam: 'kop-03', indian: 'ind-01',
};

// ── add-to-cart with cross-stall confirmation ───────────────
interface PendingAdd { itemId: string; qty: number; instr: string; from: string; to: string; onDone?: () => void }
const usePendingAdd = create<{ pending: PendingAdd | null; set: (p: PendingAdd | null) => void }>((set) => ({ pending: null, set: (pending) => set({ pending }) }));

export function useAddToCart() {
  const user = useCurrentUser();
  const nav = useNavigate();
  const bump = useCartBump((s) => s.bump);
  return (itemId: string, qty = 1, instr = '', onDone?: () => void) => {
    if (!user) {
      nav('/login');
      return;
    }
    const r = addToCart(user.id, itemId, qty, instr);
    if (r.ok) {
      bump();
      toast(`Added ${qty > 1 ? `${qty} × ` : ''}${useDb.getState().items[itemId].name} to cart`);
      onDone?.();
    } else if (r.code === 'DIFFERENT_STALL') {
      const s = useDb.getState();
      const cartStall = s.carts[user.id]?.stallId;
      usePendingAdd.getState().set({ itemId, qty, instr, from: cartStall ? s.stalls[cartStall].name : 'another stall', to: s.stalls[s.items[itemId].stallId].name, onDone });
    } else toast(r.error, 'error');
  };
}

export function CartConflictModal() {
  const { pending, set } = usePendingAdd();
  const user = useCurrentUser();
  const bump = useCartBump((s) => s.bump);
  return (
    <ConfirmationModal
      open={!!pending}
      title="Start a new cart?"
      description={
        <>Your cart has items from <b className="text-ink">{pending?.from}</b>. Each order is placed with one stall, so adding this item from <b className="text-ink">{pending?.to}</b> will replace your current cart.</>
      }
      confirmLabel="Replace cart"
      cancelLabel="Keep cart"
      onCancel={() => set(null)}
      onConfirm={() => {
        if (pending && user) {
          const r = addToCart(user.id, pending.itemId, pending.qty, pending.instr, true);
          if (r.ok) {
            bump();
            toast('Cart replaced — item added');
            pending.onDone?.();
          } else toast(r.error, 'error');
        }
        set(null);
      }}
    />
  );
}

export function FavButton({ itemId, className, size = 'md' }: { itemId: string; className?: string; size?: 'sm' | 'md' }) {
  const user = useCurrentUser();
  const fav = useDb((s) => (user ? (s.favourites[user.id] ?? []).includes(itemId) : false));
  const nav = useNavigate();
  return (
    <button
      type="button"
      aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return nav('/login');
        const now = toggleFavourite(user.id, itemId);
        toast(now ? 'Saved to favourites' : 'Removed from favourites', 'info');
      }}
      className={cx('flex items-center justify-center rounded-full bg-white/95 shadow-card transition active:scale-90', size === 'sm' ? 'h-9 w-9' : 'h-11 w-11', className)}
    >
      <Heart className={cx(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', fav ? 'fill-bad text-bad' : 'text-ink')} strokeWidth={2} />
    </button>
  );
}

function AddCircle({ item, size = 38 }: { item: MenuItem; size?: number }) {
  const add = useAddToCart();
  const stallOpen = useDb((s) => s.stalls[item.stallId].isOpen);
  const disabled = !item.isAvailable || !stallOpen;
  return (
    <button
      type="button"
      aria-label={disabled ? `${item.name} unavailable` : `Add ${item.name} to cart`}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(item.id);
      }}
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-brand shadow-sm transition hover:bg-[#F5D000] active:scale-90 disabled:bg-line disabled:text-ink-faint"
    >
      <Plus className="h-5 w-5" strokeWidth={2.4} />
    </button>
  );
}

// ── cards ───────────────────────────────────────────────────
export function CategoryCard({ id, name }: { id: CategoryId; name: string }) {
  const img = useDb((s) => s.items[CATEGORY_SIGNATURE[id]]?.imageUrl);
  return (
    <Link to={`/stall/${id}`} className="group flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 rounded-card p-1 press">
      <div className="rounded-[20px] bg-white p-1.5 shadow-card transition group-hover:shadow-lift">
        <Img src={img} alt="" label={name} className="h-[72px] w-[72px]" rounded="rounded-[16px]" />
      </div>
      <span className="text-center font-display text-[12px] font-semibold leading-tight">{name.replace(' Food', '')}</span>
    </Link>
  );
}

export function FoodCard({ item, width = 'w-[175px]' }: { item: MenuItem; width?: string }) {
  const stallName = useDb((s) => s.stalls[item.stallId].name);
  return (
    <Link to={`/food/${item.id}`} className={cx('group relative flex shrink-0 snap-start flex-col overflow-hidden rounded-card bg-white shadow-card lift press', width)}>
      <div className="relative">
        <Img src={item.imageUrl} alt={item.name} label={item.name} sold={!item.isAvailable} className="h-[125px] w-full" />
        <FavButton itemId={item.id} size="sm" className="absolute right-2 top-2" />
        {!item.isAvailable && <Badge tone="dark" className="absolute bottom-2 left-2">Sold Out</Badge>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 t-food leading-snug">{item.name}</h3>
        <p className="mt-0.5 text-[12px] text-ink-muted">{stallName}</p>
        <div className="mt-auto flex items-center justify-between pt-2.5">
          <span className="t-price">{rm(item.price)}</span>
          <AddCircle item={item} size={36} />
        </div>
      </div>
    </Link>
  );
}

export function FoodRow({ item, showStall, highlight }: { item: MenuItem; showStall?: boolean; highlight?: string }) {
  const stallName = useDb((s) => s.stalls[item.stallId].name);
  return (
    <Link to={`/food/${item.id}`} className="flex min-h-[125px] gap-3 rounded-card bg-white p-3 shadow-card lift press">
      <div className="relative shrink-0">
        <Img src={item.imageUrl} alt={item.name} label={item.name} sold={!item.isAvailable} className="h-[105px] w-[105px]" rounded="rounded-[12px]" />
        {!item.isAvailable && <Badge tone="dark" className="absolute bottom-1.5 left-1.5">Sold Out</Badge>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="t-food"><Highlight text={item.name} q={highlight} /></h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] font-medium text-ink-muted">
          {showStall && <span className="flex items-center gap-1"><Store className="h-3 w-3" />{stallName}</span>}
          {item.isAvailable && <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="h-3 w-3" />~{item.prep} min prep</span>}
        </p>
        <p className="mt-0.5 line-clamp-2 t-desc">{item.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="t-price whitespace-nowrap">{rm(item.price)}</span>
          <AddCircle item={item} />
        </div>
      </div>
    </Link>
  );
}

function Highlight({ text, q }: { text: string; q?: string }) {
  if (!q || q.trim().length < 2) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (i < 0) return <>{text}</>;
  const n = q.trim().length;
  return <>{text.slice(0, i)}<mark className="rounded bg-brand-soft px-0.5 text-ink">{text.slice(i, i + n)}</mark>{text.slice(i + n)}</>;
}

export function StallCard({ live, compact }: { live: StallLive; compact?: boolean }) {
  const { stall, load, wait } = live;
  const nav = useNavigate();
  const open = stall.isOpen;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => nav(`/stall/${stall.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && nav(`/stall/${stall.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-stall bg-white shadow-card lift press"
    >
      <div className="relative">
        <Img src={stall.imageUrl} alt={`${stall.name} stall`} label={stall.name} className={cx('w-full', compact ? 'h-[110px]' : 'h-[125px]', !open && 'grayscale')} />
        <div className="absolute left-3 top-3"><OpenBadge isOpen={open} accepting={stall.acceptingOrders} /></div>
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="h-card">{stall.name}</h3>
            <p className="line-clamp-1 t-desc">{stall.tagline}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {open ? <LevelBadge level={load.level} /> : <Badge>Opens {stall.hours.open}</Badge>}
          {open && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink tabular-nums">
              <Clock className="h-3.5 w-3.5" />{stall.acceptingOrders ? waitRange(wait) : 'Paused'}
            </span>
          )}
        </div>
        {!compact && (
          <Button size="md" variant="secondary" full className="mt-3.5" onClick={(e) => { e.stopPropagation(); nav(`/stall/${stall.id}`); }}>
            View Menu
          </Button>
        )}
      </div>
    </div>
  );
}

export function LiveStatusRow({ live }: { live: StallLive }) {
  const { stall, load, wait } = live;
  const tone = !stall.isOpen ? 'bg-ink-faint' : load.level === 'low' ? 'bg-ok' : load.level === 'moderate' ? 'bg-warn' : 'bg-bad';
  return (
    <Link to={`/stall/${stall.id}`} className="flex items-center gap-3 rounded-[14px] px-2 py-2.5 transition hover:bg-brand-pale">
      <span className={cx('h-10 w-1.5 shrink-0 rounded-full', tone)} aria-hidden />
      <Img src={stall.imageUrl} alt="" label={stall.name} className="h-11 w-11 shrink-0" rounded="rounded-[12px]" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[15px] font-semibold">{stall.name}</p>
        <p className="text-[12px] text-ink-muted">{stall.isOpen ? (load.level === 'low' ? 'Low Crowd' : load.level === 'moderate' ? 'Moderate Crowd' : 'High Crowd') : 'Closed'}</p>
      </div>
      <span className="font-display text-[14px] font-bold tabular-nums">{stall.isOpen && stall.acceptingOrders ? waitRange(wait) : stall.isOpen ? 'Paused' : '—'}</span>
      <ChevronRight className="h-4 w-4 text-ink-faint" />
    </Link>
  );
}

// ── cart line ───────────────────────────────────────────────
export function CartItemCard({ line, item, userId }: { line: CartLine; item: MenuItem; userId: string }) {
  const stallName = useDb((s) => s.stalls[item.stallId].name);
  return (
    <div className="flex gap-3 rounded-card bg-white p-3.5 shadow-card animate-slideUp">
      <Link to={`/food/${item.id}`} className="shrink-0">
        <Img src={item.imageUrl} alt={item.name} label={item.name} sold={!item.isAvailable} className="h-[84px] w-[84px]" rounded="rounded-[12px]" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="t-food">{item.name}</h3>
            <p className="text-[12px] text-ink-muted">{stallName} · {rm(item.price)} each</p>
          </div>
          <button aria-label={`Remove ${item.name}`} onClick={() => { removeLine(userId, line.key); toast(`Removed ${item.name}`, 'info'); }}
            className="-mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition hover:bg-bad-bg hover:text-bad">
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </div>
        {line.instructions && <p className="mt-1 rounded-[8px] bg-brand-pale px-2 py-1 text-[12px] text-ink-muted">“{line.instructions}”</p>}
        {!item.isAvailable && <p className="mt-1 text-[12px] font-semibold text-bad">Sold out — remove to check out</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <QuantitySelector size="sm" value={line.quantity} min={1} onChange={(v) => setLineQty(userId, line.key, v)} label={`Quantity of ${item.name}`} />
          <span className="t-price">{rm(item.price * line.quantity)}</span>
        </div>
      </div>
    </div>
  );
}

// ── order timeline ──────────────────────────────────────────
const STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'accepted', label: 'Order Accepted' },
  { key: 'preparing', label: 'Preparing Food' },
  { key: 'ready', label: 'Ready for Pickup' },
  { key: 'collected', label: 'Collected' },
];

export function OrderTimeline({ order }: { order: Order }) {
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const ended = order.status === 'cancelled' || order.status === 'rejected';
  const reached = ended ? STEPS.filter((s) => order.timeline[s.key]).length - 1 : idx;
  return (
    <ol className="relative" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i < reached || (i === reached && (order.status === 'collected'));
        const current = !ended && i === reached && order.status !== 'collected';
        const ts = order.timeline[s.key];
        const last = i === STEPS.length - 1;
        return (
          <li key={s.key} className="relative flex gap-3.5 pb-6 last:pb-0">
            {!last && <span className={cx('absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5', i < reached ? 'bg-ok' : 'bg-line')} aria-hidden />}
            <span
              className={cx(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                done ? 'border-ok bg-ok text-white' : current ? 'border-brand bg-brand text-ink animate-pulseRing' : 'border-line bg-white text-ink-faint',
              )}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <span className="text-[12px] font-bold">{i + 1}</span>}
            </span>
            <div className="pt-1">
              <p className={cx('font-display text-[15px]', done || current ? 'font-semibold text-ink' : 'font-medium text-ink-faint')}>
                {s.label}
                {current && <span className="sr-only"> (current step)</span>}
              </p>
              <p className="text-[12px] text-ink-muted tabular-nums">{ts ? clock(ts) : current ? 'In progress' : ''}</p>
            </div>
          </li>
        );
      })}
      {ended && (
        <li className="mt-4 flex items-center gap-3 rounded-[12px] bg-bad-bg p-3 text-[13px] font-medium text-bad">
          {order.status === 'rejected' ? 'Rejected by stall' : 'Cancelled'}{order.timeline[order.status] ? ` at ${clock(order.timeline[order.status]!)}` : ''}
          {order.cancelReason ? ` — ${order.cancelReason}` : ''}
        </li>
      )}
    </ol>
  );
}

// ── order card (student) ────────────────────────────────────
export function OrderCard({ order, action }: { order: Order; action?: React.ReactNode }) {
  const summary = order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ');
  return (
    <div className="rounded-card bg-white p-4 shadow-card animate-slideUp">
      <Link to={`/orders/${order.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-[15px] font-bold tabular-nums">#{order.orderNumber}</p>
            <p className="text-[12px] text-ink-muted">{order.stallName} · {dateTime(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-surface-alt p-2.5">
          <Receipt className="h-4 w-4 shrink-0 text-ink-muted" />
          <p className="line-clamp-2 flex-1 text-[13px]">{summary}</p>
          <span className="t-price text-[15px]">{rm(order.total)}</span>
        </div>
        {order.simulated && order.userId !== 'sim' ? null : order.userId === 'sim' ? <div className="mt-2"><DemoTag /></div> : null}
      </Link>
      {action && <div className="mt-3 flex gap-2">{action}</div>}
    </div>
  );
}

export function EmptyBagArt() {
  return <ShoppingBag className="h-14 w-14 text-ink" strokeWidth={1.6} />;
}
