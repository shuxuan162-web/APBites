import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, ClipboardList, Heart, HelpCircle, Info, LogOut, Pencil, Shield } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCurrentUser, useSession } from '../../store/session';
import { ConfirmationModal, PageHeader } from '../../components/ui';
import { Avatar } from '../../components/layout';

export default function Profile() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const signOut = useSession((s) => s.signOut);
  const [confirm, setConfirm] = useState(false);
  const stats = useDb((s) => {
    const mine = s.orders.filter((o) => o.userId === user.id);
    return { orders: mine.length, favs: (s.favourites[user.id] ?? []).length, unread: s.notifications.filter((n) => n.userId === user.id && !n.isRead).length };
  });

  const groups = [
    [
      { to: '/profile/edit', label: 'Edit Profile', icon: Pencil },
      { to: '/orders', label: 'My Orders', icon: ClipboardList, meta: stats.orders || undefined },
      { to: '/favourites', label: 'My Favourites', icon: Heart, meta: stats.favs || undefined },
      { to: '/notifications', label: 'Notifications', icon: Bell, meta: stats.unread ? `${stats.unread} new` : undefined },
    ],
    [
      { to: '/help', label: 'Help & Support', icon: HelpCircle },
      { to: '/about', label: 'About APBites', icon: Info },
      { to: '/privacy', label: 'Privacy Policy', icon: Shield },
    ],
  ];

  return (
    <div className="container-app page-x max-w-2xl">
      <PageHeader title="My Profile" />
      <section className="relative overflow-hidden rounded-[24px] bg-brand-soft p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand/40" />
        <div className="relative flex items-center gap-4">
          <div className="rounded-full bg-white p-1 shadow-card"><Avatar name={user.fullName} url={user.avatarUrl} size={88} /></div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-[22px] font-bold">{user.fullName}</h2>
            <p className="truncate text-[13px] text-ink-muted">{user.email}</p>
            {user.studentId && <p className="mt-1 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold">{user.studentId}</p>}
          </div>
        </div>
      </section>

      {groups.map((g, gi) => (
        <ul key={gi} className="mt-5 overflow-hidden rounded-card bg-white shadow-card">
          {g.map(({ to, label, icon: Icon, meta }) => (
            <li key={to} className="border-b border-line/70 last:border-0">
              <Link to={to} className="flex h-[58px] items-center gap-3.5 px-4 transition hover:bg-brand-pale">
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                <span className="flex-1 text-[15px] font-medium">{label}</span>
                {meta && <span className="text-[12px] font-semibold text-ink-muted">{meta}</span>}
                <ChevronRight className="h-[18px] w-[18px] text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      ))}

      <button onClick={() => setConfirm(true)} className="mt-5 flex h-[58px] w-full items-center gap-3.5 rounded-card bg-white px-4 text-bad shadow-card transition hover:bg-bad-bg">
        <LogOut className="h-[22px] w-[22px]" /><span className="flex-1 text-left text-[15px] font-semibold">Log Out</span>
      </button>
      <p className="mt-6 text-center text-[12px] text-ink-faint">APBites v1.0 · Demo mode{user.isDemo ? ' · demo account' : ''}</p>

      <ConfirmationModal open={confirm} title="Log Out?" description="Are you sure you want to sign out of APBites?" confirmLabel="Log Out" tone="danger"
        onCancel={() => setConfirm(false)} onConfirm={() => { signOut(); nav('/login', { replace: true }); }} />
    </div>
  );
}
