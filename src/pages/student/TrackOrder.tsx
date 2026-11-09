import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChefHat, CheckCircle2, Clock3, PackageCheck, RefreshCw, Store, XCircle, Hourglass } from 'lucide-react';
import { useDb } from '../../store/db';
import { toast, useCurrentUser } from '../../store/session';
import { useNow } from '../../lib/hooks';
import { clock, rm, timeAgo } from '../../lib/format';
import { cancelOrder, canStudentCancel, describeSchedule, submitFeedback } from '../../services/api';
import { BackButton, Button, ConfirmationModal, OrderStatusBadge, Stars, cx } from '../../components/ui';
import { OrderTimeline } from '../../components/food';

export default function TrackOrder() {
  const { id } = useParams();
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const order = useDb((s) => s.orders.find((o) => o.id === id && o.userId === user.id));
  const now = useNow(10000);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(Date.now());
  const [fb, setFb] = useState({ food: 0, wait: 0, overall: 0 });

  if (!order) return <Navigate to="/orders" replace />;
  const mins = order.estimatedReadyAt ? Math.max(0, Math.round((order.estimatedReadyAt - now) / 60000)) : null;

  const head = {
    pending: { icon: Hourglass, title: 'Waiting for the Stall', sub: order.scheduledPickupAt ? `Requested pickup ${describeSchedule(order.scheduledPickupAt)}. The stall hasn't confirmed yet.` : "Your order was sent. The stall hasn't confirmed it yet.", bg: 'bg-brand-pale' },
    accepted: { icon: CheckCircle2, title: 'Order Accepted!', sub: mins != null ? (mins > 0 ? `Estimated ready in ${mins} minute${mins === 1 ? '' : 's'}.` : 'Should be ready any moment.') : '', bg: 'bg-brand-pale' },
    preparing: { icon: ChefHat, title: 'Your Food Is Being Prepared!', sub: mins != null ? (mins > 0 ? `Estimated ready in ${mins} minute${mins === 1 ? '' : 's'}.` : 'Almost there — finishing up.') : '', bg: 'bg-brand-pale' },
    ready: { icon: PackageCheck, title: 'Your Food Is Ready!', sub: 'Head to the stall and show your pickup code.', bg: 'bg-ok-bg' },
    collected: { icon: CheckCircle2, title: 'Enjoy Your Meal!', sub: `Collected at ${order.timeline.collected ? clock(order.timeline.collected) : ''}.`, bg: 'bg-surface-alt' },
    cancelled: { icon: XCircle, title: 'Order Cancelled', sub: order.cancelReason ?? 'This order was cancelled.', bg: 'bg-bad-bg' },
    rejected: { icon: XCircle, title: 'Order Not Accepted', sub: order.cancelReason ? `The stall said: ${order.cancelReason}` : 'The stall could not accept this order.', bg: 'bg-bad-bg' },
  }[order.status];
  const Icon = head.icon;

  return (
    <div className="container-app page-x pb-10">
      <header className="flex items-start gap-2 pb-4 pt-4">
        <div className="-ml-2"><BackButton /></div>
        <div className="flex-1 pt-1">
          <h1 className="h-page">Track Your Order</h1>
          <p className="text-[14px] text-ink-muted tabular-nums">#{order.orderNumber} · {order.stallName}</p>
        </div>
        <button onClick={() => { useDb.persist.rehydrate(); setRefreshedAt(Date.now()); }} aria-label="Refresh order status" className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt hover:bg-line"><RefreshCw className="h-5 w-5" /></button>
      </header>

      <div className="lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-8">
        <div className="space-y-5">
          <section className={cx('relative overflow-hidden rounded-[24px] p-6', head.bg)} aria-live="polite">
            <div className="flex items-center gap-4">
              <span className={cx('flex h-16 w-16 shrink-0 items-center justify-center rounded-full', order.status === 'ready' ? 'bg-ok text-white' : order.status === 'cancelled' || order.status === 'rejected' ? 'bg-bad text-white' : 'bg-brand', ['accepted', 'preparing'].includes(order.status) && 'animate-pulseRing')}>
                <Icon className="h-8 w-8" />
              </span>
              <div>
                <h2 className="font-display text-[21px] font-bold leading-tight">{head.title}</h2>
                <p className="mt-0.5 text-[14px] text-ink-muted">{head.sub}</p>
              </div>
            </div>
            {order.status === 'ready' && (
              <div className="mt-5 rounded-[18px] bg-white p-5 text-center shadow-card">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-muted">Pickup code</p>
                <p className="mt-1 font-display text-[48px] font-extrabold leading-none tracking-[0.08em] tabular-nums">{order.pickupCode}</p>
                <p className="mt-2 text-[12px] text-ink-muted">The stall will verify this code to confirm collection.</p>
              </div>
            )}
            {['pending', 'accepted', 'preparing'].includes(order.status) && (
              <p className="mt-4 text-[12px] text-ink-muted">Pickup code <b className="text-ink">{order.pickupCode}</b> — you'll show it when your food is ready.</p>
            )}
          </section>

          <section className="rounded-[24px] bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="h-card">Order Progress</h2>
              <span className="flex items-center gap-1.5 text-[12px] text-ink-muted"><span className="h-2 w-2 rounded-full bg-ok" />Live · updated {timeAgo(Math.max(refreshedAt, order.updatedAt), now)}</span>
            </div>
            <OrderTimeline order={order} />
          </section>
        </div>

        <div className="mt-5 space-y-5 lg:mt-0">
          <section className="rounded-[24px] bg-white p-5 shadow-card">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 h-card"><Store className="h-[18px] w-[18px]" />{order.stallName}</h2><OrderStatusBadge status={order.status} /></div>
            <ul className="mt-3 space-y-2 text-[14px]">
              {order.items.map((i) => (
                <li key={i.id}><div className="flex justify-between"><span><b>{i.quantity}×</b> {i.name}</span><span className="tabular-nums">{rm(i.lineTotal)}</span></div>{i.instructions && <p className="text-[12px] text-ink-muted">“{i.instructions}”</p>}</li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-[16px] font-bold"><span>Total</span><span className="tabular-nums">{rm(order.total)}</span></div>
            <p className="mt-1 text-[12px] text-ink-muted">{order.paymentMethod === 'counter' ? 'Pay at counter on collection' : order.paymentStatus === 'refunded_demo' ? 'Demo payment refunded (simulated)' : 'Paid with demo payment (simulated)'}</p>
            {order.estimatedReadyAt && ['accepted', 'preparing'].includes(order.status) && (
              <p className="mt-3 flex items-center gap-1.5 rounded-[12px] bg-brand-pale p-2.5 text-[13px]"><Clock3 className="h-4 w-4" />Estimated ready around <b>{clock(order.estimatedReadyAt)}</b> — an estimate, not a guarantee.</p>
            )}
          </section>

          {canStudentCancel(order) && (
            <Button full variant="secondary" className="!border-bad/40 !text-bad" onClick={() => setConfirm(true)}>Cancel Order</Button>
          )}
          {['accepted', 'preparing'].includes(order.status) && <p className="text-center text-[12px] text-ink-muted">The stall has started on your order, so it can no longer be cancelled in the app.</p>}

          {order.status === 'collected' && (
            <section className="rounded-[24px] bg-white p-5 shadow-card">
              {order.feedback ? (
                <p className="text-center text-[14px] font-medium">Thanks for your feedback! ★ {order.feedback.overall}/5</p>
              ) : (
                <>
                  <h2 className="h-card">How was it?</h2>
                  {([['food', 'Food Quality'], ['wait', 'Waiting Experience'], ['overall', 'Overall Experience']] as const).map(([k, label]) => (
                    <div key={k} className="mt-2 flex items-center justify-between"><span className="text-[14px]">{label}</span><Stars label={label} value={fb[k]} onChange={(v) => setFb({ ...fb, [k]: v })} /></div>
                  ))}
                  <Button full size="md" className="mt-3" disabled={!fb.food || !fb.wait || !fb.overall} onClick={async () => {
                    const r = await submitFeedback(user.id, order.id, fb);
                    toast(r.ok ? 'Thanks for your feedback!' : r.error, r.ok ? 'success' : 'error');
                  }}>Submit Feedback</Button>
                </>
              )}
            </section>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="md" onClick={() => nav('/orders')}>All Orders</Button>
            <Button variant="secondary" size="md" onClick={() => nav('/home')}>Home</Button>
          </div>
          <p className="text-center text-[12px] text-ink-muted"><Link to={`/orders/${order.id}`} className="link-accent">View receipt details</Link></p>
        </div>
      </div>

      <ConfirmationModal open={confirm} title="Cancel this order?" description="The stall hasn't accepted it yet, so you can cancel now. This can't be undone." confirmLabel="Cancel Order" cancelLabel="Keep Order" tone="danger" loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          const r = await cancelOrder(user.id, order.id);
          setBusy(false);
          setConfirm(false);
          toast(r.ok ? 'Order cancelled' : r.error, r.ok ? 'info' : 'error');
        }} />
    </div>
  );
}
