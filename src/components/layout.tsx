import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, Bell, ClipboardList, Compass, History, Home, LayoutDashboard, LogOut, Menu, Settings, ShoppingCart, User as UserIcon, UtensilsCrossed, WifiOff, X, Gauge,
} from 'lucide-react';
import { useDb } from '../store/db';
import { toast, useCartBump, useCurrentUser, useSession } from '../store/session';
import { useCart, useOnline } from '../lib/hooks';
import { initials } from '../lib/format';
import { ConfirmationModal, IconButton, Logo, cx } from './ui';
import { CartConflictModal } from './food';

// ── guards ──────────────────────────────────────────────────
export function RequireRole({ role, children }: { role: 'student' | 'vendor'; children: ReactNode }) {
  const user = useCurrentUser();
  const session = useSession((s) => s.session);
  const signOut = useSession((s) => s.signOut);
  const loc = useLocation();
  const expired = !!session && session.expiresAt < Date.now();
  useEffect(() => {
    if (expired) signOut(true);
  }, [expired, signOut]);
  if (!session || expired) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'vendor' ? '/vendor' : '/home'} replace />;
  return <>{children}</>;
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[13px] font-medium text-white" role="status">
      <WifiOff className="h-4 w-4 text-brand" /> You're offline. Showing saved information — ordering is paused.
    </div>
  );
}

export function Avatar({ name, url, size = 44 }: { name: string; url?: string; size?: number }) {
  return url ? (
    <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-brand font-display font-bold text-ink" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function CartIconButton() {
  const { count } = useCart();
  const n = useCartBump((s) => s.n);
  const nav = useNavigate();
  return (
    <span key={n} className={n ? 'inline-block animate-bump' : 'inline-block'}>
      <IconButton label={`Cart, ${count} item${count === 1 ? '' : 's'}`} onClick={() => nav('/cart')} badge={count} variant="soft">
        <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.9} />
      </IconButton>
    </span>
  );
}

export function BellButton() {
  const user = useCurrentUser();
  const unread = useDb((s) => s.notifications.some((n) => n.userId === user?.id && !n.isRead));
  const nav = useNavigate();
  return (
    <IconButton label={unread ? 'Notifications, unread' : 'Notifications'} onClick={() => nav('/notifications')} badge={unread} variant="soft">
      <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
    </IconButton>
  );
}

// ── student shell ───────────────────────────────────────────
const TABS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/live', label: 'Live Status', icon: Activity },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

function BottomNavigation() {
  const user = useCurrentUser();
  const activeCount = useDb((s) => s.orders.filter((o) => o.userId === user?.id && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status)).length);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#F0F0F0] bg-white/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <ul className="mx-auto grid h-[72px] max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} className="group flex h-full flex-col items-center justify-center gap-1">
              {({ isActive }) => (
                <>
                  <span className={cx('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200', isActive ? 'bg-brand-soft' : 'group-hover:bg-surface-alt')}>
                    <Icon className={cx('h-[23px] w-[23px] transition-colors', isActive ? 'text-ink' : 'text-ink-faint')} strokeWidth={isActive ? 2.2 : 1.9} />
                    {to === '/orders' && activeCount > 0 && <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-ok ring-2 ring-white" aria-label={`${activeCount} active`} />}
                  </span>
                  <span className={cx('font-display text-[11px] leading-none', isActive ? 'font-bold text-ink' : 'font-medium text-ink-faint')}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function DesktopTopBar() {
  const user = useCurrentUser();
  return (
    <header className="sticky top-0 z-50 hidden border-b border-line/70 bg-white/90 backdrop-blur lg:block">
      <div className="container-app flex h-[72px] items-center gap-8 px-12">
        <Link to="/home" aria-label="APBites home"><Logo size="sm" /></Link>
        <nav aria-label="Main" className="flex flex-1 items-center gap-1">
          {TABS.slice(0, 4).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cx('flex h-10 items-center gap-2 rounded-full px-4 font-display text-[14px] transition', isActive ? 'bg-brand-soft font-bold text-ink' : 'font-medium text-ink-muted hover:bg-surface-alt hover:text-ink')}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <BellButton />
          <CartIconButton />
          <Link to="/profile" aria-label="Profile" className="ml-1 rounded-full ring-offset-2 transition hover:ring-2 hover:ring-brand">
            {user && <Avatar name={user.fullName} url={user.avatarUrl} size={40} />}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Pops a toast when a new order notification arrives (e.g. vendor accepted / food ready). */
function NotificationToaster() {
  const user = useCurrentUser();
  const latest = useDb((s) => s.notifications.find((n) => n.userId === user?.id));
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seen.current === undefined) {
      seen.current = latest?.id ?? null;
      return;
    }
    if (latest && latest.id !== seen.current && !latest.isRead && Date.now() - latest.createdAt < 15000) {
      toast(`${latest.title} ${latest.type === 'order_ready' ? `Code ${latest.message.match(/code (\w+)/i)?.[1] ?? ''}` : ''}`.trim(), latest.type.includes('cancel') || latest.type.includes('reject') ? 'error' : 'success');
    }
    seen.current = latest?.id ?? null;
  }, [latest]);
  return null;
}

export function StudentShell({ nav = true }: { nav?: boolean }) {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <RequireRole role="student">
      <NotificationToaster />
      <OfflineBanner />
      <DesktopTopBar />
      <main key={loc.pathname} className={cx('min-h-[100dvh] animate-[fadeIn_200ms_ease-out_both]', nav ? 'pb-nav lg:pb-12' : 'pb-8')}>
        <Outlet />
      </main>
      {nav && <BottomNavigation />}
      <CartConflictModal />
    </RequireRole>
  );
}

// ── vendor shell ────────────────────────────────────────────
const VNAV = [
  { to: '/vendor', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendor/orders', label: 'Incoming Orders', icon: ClipboardList },
  { to: '/vendor/menu', label: 'Menu Management', icon: UtensilsCrossed },
  { to: '/vendor/status', label: 'Live Stall Status', icon: Gauge },
  { to: '/vendor/history', label: 'Order History', icon: History },
  { to: '/vendor/settings', label: 'Settings', icon: Settings },
];

function VendorNavList({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser();
  const pending = useDb((s) => s.orders.filter((o) => o.stallId === user?.stallId && o.status === 'pending').length);
  return (
    <ul className="space-y-1">
      {VNAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cx('relative flex h-11 items-center gap-3 rounded-[12px] px-3.5 font-display text-[14px] transition', isActive ? 'bg-brand-soft font-semibold text-ink before:absolute before:left-0 before:top-2 before:h-7 before:w-1 before:rounded-r-full before:bg-brand' : 'font-medium text-ink-muted hover:bg-surface-alt hover:text-ink')}>
            <Icon className="h-[19px] w-[19px]" />
            <span className="flex-1">{label}</span>
            {to === '/vendor/orders' && pending > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-white">{pending}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function VendorShell() {
  const user = useCurrentUser();
  const stall = useDb((s) => (user?.stallId ? s.stalls[user.stallId] : null));
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const signOut = useSession((s) => s.signOut);
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const logout = () => {
    signOut();
    nav('/login', { replace: true });
  };

  const footer = (
    <div className="border-t border-line pt-4">
      {user && (
        <div className="mb-3 flex items-center gap-3 px-1">
          <Avatar name={user.fullName} size={38} />
          <div className="min-w-0">
            <p className="truncate font-display text-[14px] font-semibold">{stall?.name}</p>
            <p className="truncate text-[12px] text-ink-muted">{user.email}</p>
          </div>
        </div>
      )}
      <button onClick={() => setConfirm(true)} className="flex h-11 w-full items-center gap-3 rounded-[12px] px-3.5 font-display text-[14px] font-medium text-ink-muted hover:bg-bad-bg hover:text-bad">
        <LogOut className="h-[19px] w-[19px]" /> Log Out
      </button>
    </div>
  );

  return (
    <RequireRole role="vendor">
      <OfflineBanner />
      <div className="min-h-[100dvh] bg-surface-alt/60 lg:flex">
        <aside className="sticky top-0 hidden h-[100dvh] w-[240px] shrink-0 flex-col border-r border-line bg-white p-4 lg:flex">
          <div className="mb-6 px-2 pt-2"><Logo size="sm" /><p className="mt-1 pl-[38px] text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Vendor</p></div>
          <nav aria-label="Vendor" className="flex-1"><VendorNavList /></nav>
          {footer}
        </aside>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-white px-5 lg:hidden">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] font-semibold sm:inline">{stall?.name}</span>
            <IconButton label="Open menu" onClick={() => setOpen(true)} variant="soft"><Menu className="h-5 w-5" /></IconButton>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="flex h-full w-[280px] flex-col bg-white p-4 animate-[slideUp_200ms_ease-out_both]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Vendor menu">
              <div className="mb-6 flex items-center justify-between px-2 pt-1"><Logo size="sm" /><IconButton label="Close menu" onClick={() => setOpen(false)}><X className="h-5 w-5" /></IconButton></div>
              <nav aria-label="Vendor" className="flex-1"><VendorNavList onNavigate={() => setOpen(false)} /></nav>
              {footer}
            </div>
          </div>
        )}
        <main key={loc.pathname} className="min-w-0 flex-1 px-5 pb-12 pt-6 animate-[fadeIn_200ms_ease-out_both] sm:px-8 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-[1100px]"><Outlet /></div>
        </main>
      </div>
      <ConfirmationModal open={confirm} title="Log Out?" description="Are you sure you want to sign out of APBites?" confirmLabel="Log Out" tone="danger" onCancel={() => setConfirm(false)} onConfirm={logout} />
    </RequireRole>
  );
}
