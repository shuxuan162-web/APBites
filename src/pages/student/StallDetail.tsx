import { useNavigate, useParams } from 'react-router-dom';
import { Activity, Clock, Leaf, Store as StoreIcon, ShoppingBag, ChevronRight } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCart, useFirstLoad, useStallLive } from '../../lib/hooks';
import { rm, timeAgo, waitRange } from '../../lib/format';
import { BackButton, Badge, EmptyState, Img, InlineAlert, LevelBadge, OpenBadge, Skeleton, Button, DemoTag } from '../../components/ui';
import { FoodRow } from '../../components/food';
import { CartIconButton } from '../../components/layout';
import type { CategoryId } from '../../data/menu';

export default function StallDetail() {
  const { id } = useParams<{ id: CategoryId }>();
  const nav = useNavigate();
  const live = useStallLive();
  const items = useDb((s) => s.items);
  const updatedAt = useDb((s) => s.updatedAt);
  const cart = useCart();
  const loading = useFirstLoad(`stall-${id}`, 350);
  const l = id ? live[id] : undefined;

  if (!l) {
    return <EmptyState art={<StoreIcon className="h-14 w-14" />} title="Stall not found" description="This stall doesn't exist or was removed." action={<Button full onClick={() => nav('/explore')}>Explore Food</Button>} />;
  }
  const { stall, load, wait } = l;
  const byAvail = (a: { isAvailable: boolean }, b: { isAvailable: boolean }) => Number(b.isAvailable) - Number(a.isAvailable);
  const stallItems = Object.values(items).filter((i) => i.stallId === stall.id);
  const menu = stallItems.filter((i) => i.kind === 'food').sort(byAvail);
  const drinks = stallItems.filter((i) => i.kind === 'drink').sort(byAvail);
  const showBar = cart.count > 0;

  return (
    <div className={showBar ? 'pb-32' : 'pb-8'}>
      <div className="relative">
        <Img src={stall.imageUrl} alt={`${stall.name} stall`} label={stall.name} className="h-[210px] w-full sm:h-[280px] lg:h-[320px]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
        <div className="absolute left-4 top-4" style={{ marginTop: 'var(--safe-top)' }}><BackButton floating /></div>
        <div className="absolute right-4 top-4 lg:hidden" style={{ marginTop: 'var(--safe-top)' }}><CartIconButton /></div>
      </div>
      <div className="container-app page-x">
        <div className="relative -mt-6 rounded-t-[24px] bg-white pt-5 lg:mt-0">
          <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
            <div>
              <h1 className="h-page">{stall.name}</h1>
              <p className="mt-1 text-[14px] text-ink-muted">{stall.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <OpenBadge isOpen={stall.isOpen} accepting={stall.acceptingOrders} />
                {stall.isOpen && <LevelBadge level={load.level} />}
                {stall.isOpen && stall.acceptingOrders && <Badge tone="neutral"><Clock className="h-3 w-3" />{waitRange(wait)}</Badge>}
                {stall.byoContainer && <Badge tone="ok"><Leaf className="h-3 w-3" />BYO container welcome</Badge>}
              </div>
              <p className="mt-2 text-[12px] text-ink-muted">Hours {stall.hours.open}–{stall.hours.close}</p>
              {!stall.isOpen && <div className="mt-4"><InlineAlert tone="warn">This stall is closed right now. You can browse the menu, but ordering is unavailable.</InlineAlert></div>}
              {stall.isOpen && !stall.acceptingOrders && <div className="mt-4"><InlineAlert tone="warn">The stall has paused new app orders for now. Check back shortly.</InlineAlert></div>}
            </div>

            <aside className="mt-5 rounded-[18px] bg-brand-pale p-4 ring-1 ring-brand/50 lg:mt-0 lg:self-start">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-[16px] font-bold"><Activity className="h-[18px] w-[18px]" />Live Stall Status</h2>
                {load.simulatedActive > 0 && <DemoTag>Incl. simulated</DemoTag>}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[12px] bg-white p-2.5"><dt className="text-[11px] font-medium text-ink-muted">Workload</dt><dd className="mt-0.5 font-display text-[14px] font-bold">{stall.isOpen ? load.level[0].toUpperCase() + load.level.slice(1) : '—'}</dd></div>
                <div className="rounded-[12px] bg-white p-2.5"><dt className="text-[11px] font-medium text-ink-muted">Est. wait</dt><dd className="mt-0.5 font-display text-[14px] font-bold tabular-nums">{waitRange(wait)}</dd></div>
                <div className="rounded-[12px] bg-white p-2.5"><dt className="text-[11px] font-medium text-ink-muted">Active orders</dt><dd className="mt-0.5 font-display text-[14px] font-bold tabular-nums">{load.active}</dd></div>
              </dl>
              <p className="mt-2.5 text-[11px] text-ink-muted">
                {load.source === 'vendor_report' ? 'Workload reported by the vendor. ' : 'Estimated from app orders, not a physical headcount. '}
                Updated {timeAgo(Math.max(updatedAt, stall.lastStatusUpdated))}.
              </p>
            </aside>
          </div>

          <div className="mb-3 mt-8 flex items-end justify-between">
            <h2 className="h-section">Our Menu</h2>
            <span className="text-[13px] font-medium text-ink-muted">{menu.length} Items</span>
          </div>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[125px]" />)}</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {menu.map((i) => <FoodRow key={i.id} item={i} />)}
            </div>
          )}

          {drinks.length > 0 && (
            <section aria-label={`${stall.name} drinks`}>
              <div className="mb-3 mt-8 flex items-end justify-between">
                <h2 className="h-section">Drinks</h2>
                <span className="text-[13px] font-medium text-ink-muted">{drinks.length} Items</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {drinks.map((i) => <FoodRow key={i.id} item={i} />)}
              </div>
            </section>
          )}
        </div>
      </div>

      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-white via-white to-white/0 px-5 pb-4 pt-6" style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}>
          <button onClick={() => nav('/cart')} className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 rounded-btn bg-brand px-4 font-display shadow-float transition active:scale-[0.98] animate-slideUp">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-brand"><ShoppingBag className="h-[18px] w-[18px]" /></span>
            <span className="flex-1 text-left text-[15px] font-semibold tabular-nums">{cart.count} item{cart.count === 1 ? '' : 's'} | {rm(cart.total)}</span>
            <span className="flex items-center text-[15px] font-bold">View Cart <ChevronRight className="h-5 w-5" /></span>
          </button>
        </div>
      )}
    </div>
  );
}
