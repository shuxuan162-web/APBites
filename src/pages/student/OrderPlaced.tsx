import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useDb } from '../../store/db';
import { rm, dateTime, clock } from '../../lib/format';
import { Button, OrderStatusBadge } from '../../components/ui';
import { describeSchedule } from '../../services/api';

export function SuccessCheck() {
  return (
    <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-brand-soft animate-pop">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand shadow-float">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#202124" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" className="animate-draw" />
        </svg>
      </div>
    </div>
  );
}

export default function OrderPlaced() {
  const { id } = useParams();
  const nav = useNavigate();
  const order = useDb((s) => s.orders.find((o) => o.id === id));
  if (!order) return <Navigate to="/orders" replace />;
  const accepted = order.status !== 'pending';

  return (
    <div className="mx-auto max-w-md px-5 pb-10 pt-12 text-center">
      <SuccessCheck />
      <h1 className="mt-6 font-display text-[25px] font-bold leading-tight">Order Placed Successfully!</h1>
      <p className="mx-auto mt-2 max-w-xs text-[14px] text-ink-muted">
        {accepted ? 'Your delicious meal is on its way to being prepared!' : 'Your order has been sent to the stall. Waiting for confirmation.'}
      </p>
      <div className="mt-7 rounded-card bg-white p-5 text-left shadow-card">
        <dl className="space-y-3 text-[14px]">
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Order Number</dt><dd className="font-display font-bold tabular-nums">{order.orderNumber}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Stall</dt><dd className="font-medium">{order.stallName}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Placed</dt><dd className="font-medium">{dateTime(order.createdAt)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Total</dt><dd className="font-display font-bold tabular-nums">{rm(order.total)}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-ink-muted">Status</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Estimated Pickup</dt>
            <dd className="text-right font-medium">{order.estimatedReadyAt ? clock(order.estimatedReadyAt) : order.scheduledPickupAt ? `Requested ${describeSchedule(order.scheduledPickupAt)} · awaiting confirmation` : 'Awaiting Confirmation'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Payment</dt><dd className="font-medium">{order.paymentMethod === 'counter' ? 'Pay at Counter' : 'Demo Online Payment (simulated)'}</dd></div>
        </dl>
      </div>
      <div className="mt-6 space-y-3">
        <Button full onClick={() => nav(`/track/${order.id}`, { replace: true })}>Track My Order</Button>
        <Button full variant="secondary" onClick={() => nav('/home', { replace: true })}>Back to Home</Button>
      </div>
    </div>
  );
}
