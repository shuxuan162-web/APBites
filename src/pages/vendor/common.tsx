import { useMemo, useState, type ReactNode } from 'react';
import { Clock, MessageSquare, User } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCurrentUser, toast } from '../../store/session';
import { useStallLive } from '../../lib/hooks';
import { vendorUpdateOrder } from '../../services/api';
import { clock, rm, timeAgo, describeAge } from './format';
import type { Order, OrderStatus } from '../../lib/types';
import { Button, ConfirmationModal, DemoTag, Field, OrderStatusBadge, cx } from '../../components/ui';

export function useVendor() {
  const user = useCurrentUser()!;
  const stallId = user.stallId!;
  const stall = useDb((s) => s.stalls[stallId]);
  const allOrders = useDb((s) => s.orders);
  const orders = useMemo(() => allOrders.filter((o) => o.stallId === stallId), [allOrders, stallId]);
  const live = useStallLive()[stallId];
  return { user, stallId, stall, orders, live };
}

export function VHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="h-page">{title}</h1>{subtitle && <p className="mt-0.5 text-[14px] text-ink-muted">{subtitle}</p>}</div>
      {right}
    </header>
  );
}

export function Kpi({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-card bg-white p-5 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft">{icon}</span>
      <p className="mt-3 font-display text-[28px] font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-[13px] text-ink-muted">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-ink-faint">{sub}</p>}
    </div>
  );
}

const ACTIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  pending: [{ to: 'accepted', label: 'Accept Order' }, { to: 'rejected', label: 'Reject Order' }],
  accepted: [{ to: 'preparing', label: 'Start Preparing' }],
  preparing: [{ to: 'ready', label: 'Mark as Ready' }],
  ready: [{ to: 'collected', label: 'Confirm Collection' }],
};

export function VendorOrderCard({ order, compact }: { order: Order; compact?: boolean }) {
  const user = useCurrentUser()!;
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('Item unavailable');
  const [collect, setCollect] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');

  const run = async (to: OrderStatus, opts: { reason?: string; code?: string } = {}) => {
    setBusy(to);
    const r = await vendorUpdateOrder(user.id, order.id, to, order.version, opts);
    setBusy(null);
    if (!r.ok) {
      if (r.code === 'CODE') return setCodeErr(r.error);
      if (r.code === 'CONFLICT') useDb.persist.rehydrate();
      toast(r.error, 'error');
      return false;
    }
    toast(`${order.orderNumber}: ${to === 'accepted' ? 'accepted' : to === 'preparing' ? 'now preparing' : to === 'ready' ? 'marked ready — student notified' : to === 'collected' ? 'collected' : 'rejected'}`);
    return true;
  };

  const acts = ACTIONS[order.status] ?? [];
  const isNew = order.status === 'pending';
  return (
    <article className={cx('rounded-card bg-white p-4 shadow-card animate-slideUp', isNew && 'ring-2 ring-brand')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-display text-[16px] font-bold tabular-nums">#{order.orderNumber}{order.simulated && <DemoTag>Simulated</DemoTag>}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{clock(order.createdAt)} · {describeAge(order.createdAt)}</span>
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{order.customerName} · code {order.pickupCode}</span>
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <ul className="mt-3 space-y-1.5 rounded-[12px] bg-surface-alt p-3 text-[14px]">
        {order.items.map((i) => (
          <li key={i.id}>
            <div className="flex justify-between gap-2"><span><b className="tabular-nums">{i.quantity}×</b> {i.name}</span>{!compact && <span className="tabular-nums text-ink-muted">{rm(i.lineTotal)}</span>}</div>
            {i.instructions && <p className="mt-0.5 flex items-start gap-1 text-[12px] font-medium text-warn-text"><MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />{i.instructions}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="font-display text-[16px] font-bold tabular-nums">{rm(order.total)}</span>
        <span className="text-ink-muted">
          {order.paymentMethod === 'counter' ? 'Pay at counter' : order.paymentStatus === 'refunded_demo' ? 'Demo refund' : 'Demo paid'}
          {order.scheduledPickupAt ? ` · pickup ${clock(order.scheduledPickupAt)}` : ' · ASAP'}
          {' · '}~{order.prepMinutes} min prep
        </span>
      </div>
      {order.cancelReason && <p className="mt-2 text-[12px] text-bad">Reason: {order.cancelReason}</p>}
      {acts.length > 0 && (
        <div className="mt-3 flex gap-2">
          {acts.map((a) => (
            <Button key={a.to} size="md" className="flex-1" variant={a.to === 'rejected' ? 'secondary' : a.to === 'ready' || a.to === 'collected' ? 'dark' : 'primary'}
              loading={busy === a.to} disabled={!!busy && busy !== a.to}
              onClick={() => (a.to === 'rejected' ? setReject(true) : a.to === 'collected' ? setCollect(true) : run(a.to))}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
      <ConfirmationModal open={reject} title="Reject this order?" description="The student will be notified with your reason." confirmLabel="Reject Order" tone="danger" loading={busy === 'rejected'}
        onCancel={() => setReject(false)} onConfirm={async () => { if (await run('rejected', { reason })) setReject(false); }}>
        <div className="mt-4"><Field id={`r-${order.id}`} label="Reason">
          <select id={`r-${order.id}`} className="field h-11" value={reason} onChange={(e) => setReason(e.target.value)}>
            {['Item unavailable', 'Stall too busy right now', 'Closing soon', 'Unable to fulfil special request'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field></div>
      </ConfirmationModal>
      <ConfirmationModal open={collect} title="Confirm collection" description={<>Ask the student for their pickup code and enter it to complete order {order.orderNumber}.{order.simulated && <> (Simulated order — code is <b>{order.pickupCode}</b>.)</>}</>} confirmLabel="Confirm Collection" loading={busy === 'collected'}
        onCancel={() => { setCollect(false); setCodeErr(''); setCode(''); }} onConfirm={async () => { if (await run('collected', { code })) { setCollect(false); setCode(''); } }}>
        <div className="mt-4"><Field id={`c-${order.id}`} label="Pickup code" error={codeErr}>
          <input id={`c-${order.id}`} className="field text-center font-display text-[22px] font-bold uppercase tracking-[0.2em]" maxLength={4} value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCodeErr(''); }} placeholder="A128" autoComplete="off" />
        </Field></div>
      </ConfirmationModal>
    </article>
  );
}

export { timeAgo };
