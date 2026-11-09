import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useDb } from '../../store/db';
import { toast, useCurrentUser } from '../../store/session';
import { clock, dateTime, rm } from '../../lib/format';
import { reorder, describeSchedule } from '../../services/api';
import { Button, OrderStatusBadge, PageHeader } from '../../components/ui';

export default function OrderDetails() {
  const { id } = useParams();
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const o = useDb((s) => s.orders.find((x) => x.id === id && x.userId === user.id));
  if (!o) return <Navigate to="/orders" replace />;
  const active = ['pending', 'accepted', 'preparing', 'ready'].includes(o.status);
  const pay = o.paymentMethod === 'counter' ? 'Pay at Counter' : `Demo Online Payment — ${o.paymentStatus === 'refunded_demo' ? 'refunded (simulated)' : 'paid (simulated)'}`;

  return (
    <div className="container-app page-x max-w-2xl">
      <PageHeader title="Order Details" back />
      <div className="rounded-card bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div><p className="font-display text-[18px] font-bold tabular-nums">#{o.orderNumber}</p><p className="text-[13px] text-ink-muted">{dateTime(o.createdAt)}</p></div>
          <OrderStatusBadge status={o.status} />
        </div>
        <p className="mt-3 font-display text-[15px] font-semibold">{o.stallName}</p>
        <table className="mt-3 w-full text-[14px]">
          <thead><tr className="text-left text-[12px] text-ink-muted"><th className="pb-2 font-medium">Item</th><th className="pb-2 text-center font-medium">Qty</th><th className="pb-2 text-right font-medium">Unit</th><th className="pb-2 text-right font-medium">Total</th></tr></thead>
          <tbody className="tabular-nums">
            {o.items.map((i) => (
              <tr key={i.id} className="border-t border-line align-top">
                <td className="py-2.5 pr-2">{i.name}{i.instructions && <span className="block text-[12px] text-ink-muted">“{i.instructions}”</span>}</td>
                <td className="py-2.5 text-center">{i.quantity}</td>
                <td className="py-2.5 text-right">{rm(i.unitPrice)}</td>
                <td className="py-2.5 text-right font-medium">{rm(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-[14px]">
          <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd className="tabular-nums">{rm(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-muted">Service Fee</dt><dd className="tabular-nums">{rm(o.serviceFee)}</dd></div>
          <div className="flex justify-between font-display text-[17px] font-bold"><dt>Total</dt><dd className="tabular-nums">{rm(o.total)}</dd></div>
        </dl>
        <dl className="mt-4 space-y-1.5 rounded-[12px] bg-surface-alt p-3.5 text-[13px]">
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Payment</dt><dd className="text-right font-medium">{pay}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-ink-muted">Pickup</dt><dd className="text-right font-medium">Self Pickup{o.scheduledPickupAt ? ` · ${describeSchedule(o.scheduledPickupAt)}` : ' · ASAP'}</dd></div>
          {o.timeline.collected && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Collected</dt><dd className="font-medium">{clock(o.timeline.collected)}</dd></div>}
          {o.cancelReason && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Reason</dt><dd className="text-right font-medium">{o.cancelReason}</dd></div>}
        </dl>
        <p className="mt-3 text-[12px] text-ink-muted">Prices shown are the prices at the time of ordering.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {active ? <Button full onClick={() => nav(`/track/${o.id}`)}>Track Order</Button> : (
          <Button full icon={<RotateCcw className="h-4 w-4" />} onClick={() => {
            const r = reorder(user.id, o.id, true);
            if (!r.ok) return toast(r.error, 'error');
            const notes = [...r.data.unavailable.map((n) => `${n} is unavailable`), ...r.data.priceChanged];
            toast(notes.length ? `Added to cart. ${notes.join('; ')}.` : 'Added to cart at current prices', notes.length ? 'info' : 'success');
            nav('/cart');
          }}>Reorder</Button>
        )}
        <Button full variant="secondary" onClick={() => nav('/orders')}>Back to Orders</Button>
      </div>
    </div>
  );
}
