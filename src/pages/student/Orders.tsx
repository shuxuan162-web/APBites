import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RotateCcw, Star } from 'lucide-react';
import { useDb } from '../../store/db';
import { toast, useCurrentUser } from '../../store/session';
import { reorder } from '../../services/api';
import { Button, EmptyState, PageHeader, cx } from '../../components/ui';
import { OrderCard } from '../../components/food';

const TABS = [
  { k: 'active', label: 'Active', match: ['pending', 'accepted', 'preparing', 'ready'] },
  { k: 'completed', label: 'Completed', match: ['collected'] },
  { k: 'cancelled', label: 'Cancelled', match: ['cancelled', 'rejected'] },
] as const;

export default function Orders() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const all = useDb((s) => s.orders);
  const mine = useMemo(() => all.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt), [all, user.id]);
  const hasActive = mine.some((o) => (TABS[0].match as readonly string[]).includes(o.status));
  const [tab, setTab] = useState<(typeof TABS)[number]['k']>(hasActive || !mine.length ? 'active' : 'completed');
  const list = mine.filter((o) => (TABS.find((t) => t.k === tab)!.match as readonly string[]).includes(o.status));

  const doReorder = (id: string) => {
    const r = reorder(user.id, id, true);
    if (!r.ok) return toast(r.error, 'error');
    const notes = [...r.data.unavailable.map((n) => `${n} is unavailable`), ...r.data.priceChanged];
    toast(notes.length ? `Added to cart. ${notes.join('; ')}.` : 'Added to cart at current prices', notes.length ? 'info' : 'success');
    nav('/cart');
  };

  return (
    <div className="container-app page-x">
      <PageHeader title="My Orders" subtitle="Keep track of your campus cravings." />
      <div className="flex border-b border-line" role="tablist">
        {TABS.map((t) => {
          const n = mine.filter((o) => (t.match as readonly string[]).includes(o.status)).length;
          return (
            <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
              className={cx('relative h-12 flex-1 font-display text-[14px] transition sm:flex-none sm:px-6', tab === t.k ? 'font-bold text-ink' : 'font-medium text-ink-faint hover:text-ink-muted')}>
              {t.label}{n > 0 && <span className="ml-1 tabular-nums">({n})</span>}
              {tab === t.k && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => (
          <OrderCard key={o.id} order={o} action={
            tab === 'active' ? <Button size="md" full onClick={() => nav(`/track/${o.id}`)}>Track Order</Button>
              : tab === 'completed' ? (
                <>
                  <Button size="md" variant="secondary" className="flex-1" icon={<RotateCcw className="h-4 w-4" />} onClick={() => doReorder(o.id)}>Reorder</Button>
                  <Button size="md" variant="ghost" className="flex-1" icon={<Star className="h-4 w-4" />} onClick={() => nav(`/track/${o.id}`)}>{o.feedback ? 'Rated' : 'Feedback'}</Button>
                </>
              ) : o.cancelReason ? <p className="text-[12px] text-ink-muted">Reason: {o.cancelReason}</p> : null
          } />
        ))}
      </div>
      {!list.length && (
        <EmptyState art={<ClipboardList className="h-14 w-14" strokeWidth={1.6} />}
          title={tab === 'active' ? 'No orders yet!' : tab === 'completed' ? 'No completed orders' : 'No cancelled orders'}
          description={tab === 'cancelled' ? 'Nice — nothing cancelled here.' : 'Your next favourite meal is waiting to be discovered.'}
          action={tab !== 'cancelled' ? <Button full onClick={() => nav('/explore')}>Explore Menu</Button> : undefined} />
      )}
    </div>
  );
}
