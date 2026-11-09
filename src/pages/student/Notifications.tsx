import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ChefHat, PackageCheck, Store, XCircle, CreditCard, Clock } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCurrentUser } from '../../store/session';
import { markRead } from '../../services/api';
import { timeAgo } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { Button, EmptyState, PageHeader, cx } from '../../components/ui';
import type { NotificationType } from '../../lib/types';

const ICON: Record<NotificationType, { icon: typeof Bell; cls: string }> = {
  order_accepted: { icon: CheckCircle2, cls: 'bg-brand text-ink' },
  order_preparing: { icon: ChefHat, cls: 'bg-warn-bg text-warn-text' },
  order_ready: { icon: PackageCheck, cls: 'bg-ok text-white' },
  order_collected: { icon: CheckCircle2, cls: 'bg-surface-alt text-ink' },
  order_cancelled: { icon: XCircle, cls: 'bg-bad-bg text-bad' },
  order_rejected: { icon: XCircle, cls: 'bg-bad-bg text-bad' },
  stall_closed: { icon: Store, cls: 'bg-surface-alt text-ink' },
  pickup_reminder: { icon: Clock, cls: 'bg-brand-soft text-ink' },
  payment: { icon: CreditCard, cls: 'bg-surface-alt text-ink' },
};

export default function Notifications() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const now = useNow(30000);
  const list = useDb((s) => s.notifications).filter((n) => n.userId === user.id);
  const unread = list.some((n) => !n.isRead);
  return (
    <div className="container-app page-x max-w-2xl">
      <PageHeader title="Notifications" back right={unread ? <button onClick={() => markRead(user.id)} className="mt-2 h-10 whitespace-nowrap px-1 text-[13px] link-accent">Mark All as Read</button> : undefined} />
      {list.length ? (
        <ul className="space-y-2.5">
          {list.map((n) => {
            const m = ICON[n.type];
            const Icon = m.icon;
            return (
              <li key={n.id}>
                <button onClick={() => { markRead(user.id, n.id); if (n.orderId) nav(`/track/${n.orderId}`); }}
                  className={cx('flex w-full items-start gap-3 rounded-card p-4 text-left shadow-card transition hover:shadow-lift', n.isRead ? 'bg-white' : 'bg-brand-pale ring-1 ring-brand/50')}>
                  <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', m.cls)}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-display text-[15px] font-semibold">{n.title}</span>
                      {!n.isRead && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-ink" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-ink-muted">{n.message}</span>
                    <span className="mt-1 block text-[12px] text-ink-faint">{timeAgo(n.createdAt, now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState art={<Bell className="h-14 w-14" strokeWidth={1.6} />} title="You're all caught up!" description="Order updates from stalls will appear here." action={<Button full onClick={() => nav('/explore')}>Explore Food</Button>} />
      )}
    </div>
  );
}
