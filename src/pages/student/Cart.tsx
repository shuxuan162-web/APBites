import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCart } from '../../lib/hooks';
import { rm } from '../../lib/format';
import { Button, EmptyState, InlineAlert, PageHeader, ConfirmationModal } from '../../components/ui';
import { CartItemCard, EmptyBagArt } from '../../components/food';
import { clearCart } from '../../services/api';
import { useState } from 'react';

export default function Cart() {
  const nav = useNavigate();
  const { userId, cart, lines, subtotal, serviceFee, total, count } = useCart();
  const stall = useDb((s) => (cart.stallId ? s.stalls[cart.stallId] : null));
  const [confirm, setConfirm] = useState(false);
  const soldOut = lines.some((l) => !l.item.isAvailable);

  if (!lines.length || !userId) {
    return (
      <div className="container-app page-x">
        <PageHeader title="My Cart" back />
        <EmptyState art={<EmptyBagArt />} title="Your Cart Is Empty!" description="Looks like you haven't picked your next bite yet." action={<Button full onClick={() => nav('/explore')}>Explore Food</Button>} />
      </div>
    );
  }

  return (
    <div className="container-app page-x pb-32">
      <PageHeader title="My Cart" subtitle="Almost time to eat!" back right={<button onClick={() => setConfirm(true)} className="h-11 px-2 text-[13px] font-semibold text-ink-muted hover:text-bad">Clear</button>} />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
        <div>
          {stall && (
            <button onClick={() => nav(`/stall/${stall.id}`)} className="mb-3 flex w-full items-center gap-2 rounded-[12px] bg-brand-pale px-3.5 py-3 text-left">
              <Store className="h-[18px] w-[18px]" />
              <span className="flex-1 font-display text-[15px] font-semibold">{stall.name}</span>
              <span className="text-[13px] link-accent">Add more</span>
            </button>
          )}
          {stall && !stall.isOpen && <div className="mb-3"><InlineAlert tone="warn">{stall.name} is closed right now, so this cart can't be checked out.</InlineAlert></div>}
          {soldOut && <div className="mb-3"><InlineAlert tone="error">Some items are sold out. Remove them to continue.</InlineAlert></div>}
          <div className="space-y-3">
            {lines.map(({ line, item }) => <CartItemCard key={line.key} line={line} item={item} userId={userId} />)}
          </div>
        </div>
        <aside className="mt-6 lg:mt-0">
          <div className="rounded-card bg-white p-5 shadow-card lg:sticky lg:top-24">
            <h2 className="h-card">Order Summary</h2>
            <dl className="mt-3 space-y-2 text-[14px] tabular-nums">
              <div className="flex justify-between"><dt className="text-ink-muted">Subtotal ({count} item{count === 1 ? '' : 's'})</dt><dd>{rm(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Service Fee</dt><dd>{rm(serviceFee)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 font-display text-[17px] font-bold"><dt>Total</dt><dd>{rm(total)}</dd></div>
            </dl>
            <Button full className="mt-5 hidden h-14 lg:flex" disabled={soldOut || !stall?.isOpen} onClick={() => nav('/checkout')}>Proceed to Checkout</Button>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 pt-3 backdrop-blur lg:hidden" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <Button full className="mx-auto h-14 max-w-lg" disabled={soldOut || !stall?.isOpen} onClick={() => nav('/checkout')}>Proceed to Checkout · {rm(total)}</Button>
      </div>
      <ConfirmationModal open={confirm} title="Clear cart?" description="All items will be removed from your cart." confirmLabel="Clear cart" tone="danger" onCancel={() => setConfirm(false)} onConfirm={() => { clearCart(userId); setConfirm(false); }} />
    </div>
  );
}
