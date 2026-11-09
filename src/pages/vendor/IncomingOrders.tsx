import { useEffect, useRef, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { EmptyState, cx } from '../../components/ui';
import { toast } from '../../store/session';
import { useVendor, VHeader, VendorOrderCard } from './common';
import type { OrderStatus } from '../../lib/types';

const TABS: { k: OrderStatus; label: string }[] = [
  { k: 'pending', label: 'New' }, { k: 'accepted', label: 'Accepted' }, { k: 'preparing', label: 'Preparing' },
  { k: 'ready', label: 'Ready' }, { k: 'collected', label: 'Completed' }, { k: 'cancelled', label: 'Cancelled' },
];

export default function IncomingOrders() {
  const { orders, stall } = useVendor();
  const [tab, setTab] = useState<OrderStatus>('pending');
  const match = (o: { status: OrderStatus }, k: OrderStatus) => (k === 'cancelled' ? o.status === 'cancelled' || o.status === 'rejected' : o.status === k);
  const pendingIds = orders.filter((o) => o.status === 'pending').map((o) => o.id);
  const seen = useRef(new Set(pendingIds));
  useEffect(() => {
    const fresh = pendingIds.filter((id) => !seen.current.has(id));
    if (fresh.length) toast(`${fresh.length} new order${fresh.length > 1 ? 's' : ''} received`, 'info');
    pendingIds.forEach((id) => seen.current.add(id));
  }, [pendingIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = orders
    .filter((o) => match(o, tab))
    .sort((a, b) => (['collected', 'cancelled'].includes(tab) ? b.updatedAt - a.updatedAt : a.createdAt - b.createdAt))
    .slice(0, ['collected', 'cancelled'].includes(tab) ? 30 : 100);

  return (
    <>
      <VHeader title="Incoming Orders" subtitle={`${stall.name} · oldest first so nothing waits too long`} />
      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map((t) => {
          const n = orders.filter((o) => match(o, t.k)).length;
          return (
            <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
              className={cx('flex h-10 shrink-0 items-center gap-2 rounded-full px-4 font-display text-[13px] font-semibold transition', tab === t.k ? 'bg-ink text-white' : 'bg-white text-ink-muted shadow-sm hover:text-ink')}>
              {t.label}
              <span className={cx('rounded-full px-1.5 text-[11px] tabular-nums', tab === t.k ? 'bg-brand text-ink' : 'bg-surface-alt')}>{n}</span>
            </button>
          );
        })}
      </div>
      {list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((o) => <VendorOrderCard key={o.id} order={o} />)}</div>
      ) : (
        <EmptyState art={<ClipboardList className="h-14 w-14" strokeWidth={1.6} />} title="Nothing here" description={tab === 'pending' ? 'New orders from students will appear here in real time.' : 'No orders in this stage right now.'} />
      )}
    </>
  );
}
