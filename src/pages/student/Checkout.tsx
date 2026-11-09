import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CalendarClock, CreditCard, Package, Store, Wallet, Zap, ShieldCheck } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCart, useOnline, useStallLive } from '../../lib/hooks';
import { rm, waitRange } from '../../lib/format';
import { describeSchedule, pickupSlots, placeOrder } from '../../services/api';
import { orderPrepMinutes } from '../../lib/waitTime';
import { Button, InlineAlert, Modal, PageHeader, cx } from '../../components/ui';
import type { PaymentMethod } from '../../lib/types';

function Option({ selected, onClick, icon, title, desc, tag }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; tag?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={cx('flex w-full items-start gap-3 rounded-[14px] border-[1.5px] p-3.5 text-left transition', selected ? 'border-brand bg-brand-pale' : 'border-line bg-white hover:border-ink/30')}>
      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', selected ? 'bg-brand' : 'bg-surface-alt')}>{icon}</span>
      <span className="flex-1">
        <span className="flex items-center gap-2 font-display text-[15px] font-semibold">{title}{tag && <span className="rounded-full border border-dashed border-ink/30 px-2 text-[10px] font-semibold text-ink-muted">{tag}</span>}</span>
        <span className="block text-[13px] text-ink-muted">{desc}</span>
      </span>
      <span className={cx('mt-2.5 h-5 w-5 shrink-0 rounded-full border-2', selected ? 'border-ink bg-ink shadow-[inset_0_0_0_3px_#FFFDF0]' : 'border-line')} aria-hidden />
    </button>
  );
}

export default function Checkout() {
  const nav = useNavigate();
  const online = useOnline();
  const { userId, cart, lines, total } = useCart();
  const stall = useDb((s) => (cart.stallId ? s.stalls[cart.stallId] : null));
  const live = useStallLive();
  const [timing, setTiming] = useState<'asap' | 'schedule'>('asap');
  const [slot, setSlot] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>('counter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [payModal, setPayModal] = useState(false);

  const prep = orderPrepMinutes(lines.map((l) => ({ prep: l.item.prep, quantity: l.line.quantity })));
  const slots = useMemo(() => (stall ? pickupSlots(stall, prep + 5) : []), [stall, prep]);

  if (!userId || !stall || !lines.length) return <Navigate to="/cart" replace />;
  const l = live[stall.id];
  const estimate = stall.isOpen && stall.acceptingOrders ? Math.max(1, Math.round(l.load.queueMinutes + prep)) : null;
  const blocked = !stall.isOpen || !stall.acceptingOrders || lines.some((x) => !x.item.isAvailable);

  const submit = async () => {
    setError(null);
    if (timing === 'schedule' && !slot) return setError({ msg: 'Please choose a pickup time.' });
    setLoading(true);
    const r = await placeOrder(userId, { paymentMethod: payment, scheduledAt: timing === 'schedule' ? slot : null, expectedTotal: total });
    setLoading(false);
    if (!r.ok) {
      if (r.code === 'DUPLICATE') return;
      if (r.code === 'AUTH') return nav('/login');
      return setError({ msg: r.error, code: r.code });
    }
    nav(`/order-placed/${r.data.id}`, { replace: true });
  };

  return (
    <div className="container-app page-x pb-32">
      <PageHeader title="Checkout" back />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="space-y-6">
          {error && (
            <InlineAlert tone="error" action={['CLOSED', 'PAUSED', 'SOLD_OUT'].includes(error.code ?? '') ? <button className="whitespace-nowrap font-semibold underline" onClick={() => nav(`/stall/${stall.id}`)}>Back to menu</button> : undefined}>
              {error.msg}
            </InlineAlert>
          )}
          {!online && <InlineAlert tone="warn">You're offline. Reconnect to place your order — your cart is saved.</InlineAlert>}
          {blocked && !error && <InlineAlert tone="warn">{!stall.isOpen ? `${stall.name} is closed right now.` : !stall.acceptingOrders ? `${stall.name} has paused new orders.` : 'Some items are sold out.'} <button className="font-semibold underline" onClick={() => nav(`/stall/${stall.id}`)}>Back to menu</button></InlineAlert>}

          <section>
            <h2 className="h-card mb-2.5">Collection Method</h2>
            <div className="flex items-start gap-3 rounded-[14px] border-[1.5px] border-brand bg-brand-pale p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand"><Package className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-[15px] font-semibold">Self Pickup</p>
                <p className="text-[13px] text-ink-muted">Collect your order directly from the cafeteria stall.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="h-card mb-2.5">Pickup Timing</h2>
            <div className="space-y-2.5" role="radiogroup" aria-label="Pickup timing">
              <Option selected={timing === 'asap'} onClick={() => setTiming('asap')} icon={<Zap className="h-5 w-5" />} title="As Soon As Possible" desc={estimate ? `Estimated ready in about ${waitRange(estimate)} once accepted` : 'Estimate unavailable'} />
              <Option selected={timing === 'schedule'} onClick={() => setTiming('schedule')} icon={<CalendarClock className="h-5 w-5" />} title="Schedule Pickup" desc={`Within stall hours ${stall.hours.open}–${stall.hours.close}`} />
            </div>
            {timing === 'schedule' && (
              <div className="mt-3">
                <label htmlFor="slot" className="field-label">Pickup time</label>
                {slots.length ? (
                  <select id="slot" value={slot ?? ''} onChange={(e) => setSlot(Number(e.target.value) || null)} className="field">
                    <option value="">Choose a time</option>
                    {slots.map((t) => <option key={t} value={t}>{describeSchedule(t)}</option>)}
                  </select>
                ) : <InlineAlert tone="warn">No pickup times are available within today's or tomorrow's hours.</InlineAlert>}
              </div>
            )}
          </section>

          <section>
            <h2 className="h-card mb-2.5">Payment Method</h2>
            <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
              <Option selected={payment === 'counter'} onClick={() => setPayment('counter')} icon={<Wallet className="h-5 w-5" />} title="Pay at Counter" desc="Pay the stall when you collect your food." />
              <Option selected={payment === 'demo_online'} onClick={() => setPayment('demo_online')} icon={<CreditCard className="h-5 w-5" />} title="Demo Online Payment" tag="Simulated" desc="No real money moves and no card details are collected." />
            </div>
          </section>
        </div>

        <aside className="mt-6 lg:mt-0">
          <div className="rounded-card bg-white p-5 shadow-card lg:sticky lg:top-24">
            <h2 className="flex items-center gap-2 h-card"><Store className="h-[18px] w-[18px]" />{stall.name}</h2>
            <ul className="mt-3 space-y-2.5 border-b border-line pb-3">
              {lines.map(({ line, item }) => (
                <li key={line.key} className="text-[14px]">
                  <div className="flex justify-between gap-3"><span><b className="tabular-nums">{line.quantity}×</b> {item.name}</span><span className="tabular-nums">{rm(item.price * line.quantity)}</span></div>
                  {line.instructions && <p className="text-[12px] text-ink-muted">“{line.instructions}”</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-ink-muted">Pickup</dt><dd className="font-medium">Self Pickup · {timing === 'asap' ? 'ASAP' : slot ? describeSchedule(slot) : 'Choose time'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Est. preparation</dt><dd className="font-medium tabular-nums">~{prep} min</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Service Fee</dt><dd className="font-medium tabular-nums">RM 0.00</dd></div>
              <div className="flex justify-between pt-2 font-display text-[17px] font-bold text-ink"><dt>Total</dt><dd className="tabular-nums">{rm(total)}</dd></div>
            </dl>
            <p className="mt-3 flex items-start gap-1.5 text-[12px] text-ink-muted"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Prices and availability are re-checked when you place the order.</p>
            <Button full className="mt-4 hidden h-14 lg:flex" loading={loading} disabled={blocked || !online} onClick={() => (payment === 'demo_online' ? setPayModal(true) : submit())}>Place Order</Button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 pt-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <Button full className="mx-auto h-14 max-w-lg tabular-nums" loading={loading} disabled={blocked || !online} onClick={() => (payment === 'demo_online' ? setPayModal(true) : submit())}>Place Order · {rm(total)}</Button>
      </div>

      <Modal open={payModal} onClose={() => setPayModal(false)} label="Demo payment" sheet>
        <div className="flex items-center gap-2"><CreditCard className="h-5 w-5" /><h2 className="font-display text-[21px] font-bold">Demo Payment</h2></div>
        <p className="mt-2 text-[14px] text-ink-muted">This is a simulated payment for the hackathon prototype. No real money is charged and no card details are collected.</p>
        <div className="mt-4 flex items-center justify-between rounded-[14px] bg-brand-pale p-4"><span className="font-medium">Amount</span><span className="font-display text-[21px] font-bold tabular-nums">{rm(total)}</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="md" onClick={() => { setPayModal(false); setError({ msg: 'Demo payment was cancelled. No order was placed and nothing was charged.' }); }}>Cancel payment</Button>
          <Button size="md" onClick={() => { setPayModal(false); submit(); }}>Approve (demo)</Button>
        </div>
      </Modal>
    </div>
  );
}
