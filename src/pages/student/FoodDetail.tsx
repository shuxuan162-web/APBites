import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Info, Store, UtensilsCrossed } from 'lucide-react';
import { useDb } from '../../store/db';
import { useStallLive } from '../../lib/hooks';
import { rm, waitRange } from '../../lib/format';
import { BackButton, Badge, Button, EmptyState, Img, InlineAlert, QuantitySelector, OpenBadge } from '../../components/ui';
import { FavButton, useAddToCart } from '../../components/food';

export default function FoodDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const item = useDb((s) => s.items[id]);
  const live = useStallLive();
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const add = useAddToCart();

  if (!item) {
    return <EmptyState art={<UtensilsCrossed className="h-14 w-14" />} title="Item not found" description="This dish is no longer on the menu." action={<Button full onClick={() => nav('/explore')}>Explore Food</Button>} />;
  }
  const { stall, wait } = live[item.stallId];
  const canOrder = item.isAvailable && stall.isOpen;
  const isDrink = item.kind === 'drink';

  return (
    <div className="pb-32">
      <div className="container-app md:grid md:grid-cols-2 md:gap-8 md:px-8 md:pt-6 lg:gap-12 lg:px-12 lg:pt-8">
        <div className="relative">
          <Img src={item.imageUrl} alt={item.name} label={item.name} sold={!item.isAvailable} className="aspect-[4/3] w-full md:aspect-square" rounded="rounded-b-[28px] md:rounded-[28px]" />
          <div className="absolute left-4 top-4" style={{ marginTop: 'var(--safe-top)' }}><BackButton floating /></div>
          <div className="absolute right-4 top-4" style={{ marginTop: 'var(--safe-top)' }}><FavButton itemId={item.id} /></div>
        </div>
        <div className="page-x pt-5 md:px-0 md:pt-0">
          <Link to={`/stall/${stall.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted hover:text-ink"><Store className="h-4 w-4" />{stall.name}</Link>
          <div className="mt-1 flex items-start justify-between gap-4">
            <h1 className="font-display text-[26px] font-bold leading-[1.2]">{item.name}</h1>
            <p className="shrink-0 whitespace-nowrap pt-0.5 font-display text-[23px] font-bold tabular-nums">{rm(item.price)}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.isAvailable ? <Badge tone="ok" dot>Available</Badge> : <Badge tone="dark">Sold Out</Badge>}
            <OpenBadge isOpen={stall.isOpen} accepting={stall.acceptingOrders} />
            <Badge tone="neutral"><Clock className="h-3 w-3" />~{item.prep} min prep</Badge>
            {stall.isOpen && stall.acceptingOrders && <Badge tone="brand">Est. ready {waitRange(wait != null ? Math.round(wait - live[item.stallId].typical + item.prep) : null)}</Badge>}
          </div>
          <p className="mt-4 text-[14px] leading-[1.6] text-ink-muted">{item.description}</p>

          {/* Drinks without ingredients skip this block entirely. */}
          {(!isDrink || !!item.ingredients?.length) && (
            <>
              <h2 className="mt-6 font-display text-[16px] font-semibold">What's Inside?</h2>
              {item.ingredients?.length ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">{item.ingredients.map((g) => <span key={g} className="rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-medium">{g}</span>)}</div>
                  <p className="mt-2 text-[12px] text-ink-muted">Ingredient list provided by the stall. Not verified for allergens — please ask the stall if you have an allergy.</p>
                </>
              ) : (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-ink-muted"><Info className="mt-0.5 h-4 w-4 shrink-0" />Detailed ingredients are pending vendor verification. Please ask the stall about allergens.</p>
              )}
            </>
          )}
          {isDrink && <p className="mt-3 text-[12px] text-ink-muted">Sample price — set by the stall and may change.</p>}

          <label htmlFor="notes" className="mt-6 block font-display text-[16px] font-semibold">Special Instructions (Optional)</label>
          <textarea id="notes" rows={3} maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isDrink ? "E.g. Less sugar, less ice…" : "E.g. Less spicy, no onions…"}
            className="mt-2 w-full resize-none rounded-[12px] bg-surface-alt p-3.5 text-[14px] placeholder:text-ink-faint focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/70" />
          <div className="flex justify-between text-[12px] text-ink-muted"><span>Requests depend on stall availability and can't always be fulfilled.</span><span className="tabular-nums">{notes.length}/200</span></div>

          <div className="mt-6 flex items-center justify-between">
            <span className="font-display text-[16px] font-semibold">Quantity</span>
            <QuantitySelector value={qty} onChange={setQty} min={1} max={20} />
          </div>
          {!canOrder && <div className="mt-5"><InlineAlert tone="warn">{!item.isAvailable ? 'This item is sold out right now.' : `${stall.name} is closed right now.`}</InlineAlert></div>}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 pt-3 backdrop-blur" style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}>
        <div className="mx-auto max-w-lg">
          <Button full disabled={!canOrder} onClick={() => add(item.id, qty, notes, () => nav(-1))} className="tabular-nums">
            {canOrder ? `Add to Cart — ${rm(item.price * qty)}` : item.isAvailable ? 'Stall closed' : 'Sold Out'}
          </Button>
        </div>
      </div>
    </div>
  );
}
