import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChefHat, Clock, MapPin, RotateCcw, Timer, Wallet, Sparkles } from 'lucide-react';
import { useDb } from '../../store/db';
import { toast, useCurrentUser } from '../../store/session';
import { useFirstLoad, useStallLive } from '../../lib/hooks';
import { CATEGORY_ORDER } from '../../data/menu';
import { firstName, greeting, rm, waitRange } from '../../lib/format';
import { reorder } from '../../services/api';
import { Button, Img, SearchBar, SectionHeader, Skeleton, cx } from '../../components/ui';
import { BellButton, CartIconButton, Avatar } from '../../components/layout';
import { CategoryCard, FoodCard, LiveStatusRow } from '../../components/food';

const FEATURED = ['wes-03', 'kor-01', 'kop-03', 'sha-01', 'jap-01', 'ind-01', 'mam-04', 'chi-02'];

export default function Home() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const loading = useFirstLoad('home');
  const stalls = useDb((s) => s.stalls);
  const items = useDb((s) => s.items);
  const orders = useDb((s) => s.orders);
  const live = useStallLive();

  const mine = useMemo(() => orders.filter((o) => o.userId === user.id).sort((a, b) => b.createdAt - a.createdAt), [orders, user.id]);
  const active = mine.find((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status));
  const past = mine.filter((o) => o.status === 'collected').slice(0, 4);
  const openLive = live.list.filter((l) => l.stall.isOpen && l.stall.acceptingOrders && l.wait != null);
  const lowCount = openLive.filter((l) => l.load.level === 'low').length;
  const snapshot = [...openLive].sort((a, b) => (a.wait ?? 0) - (b.wait ?? 0));
  const snapRows = [snapshot[0], snapshot[Math.floor(snapshot.length / 2)], snapshot[snapshot.length - 1]].filter((v, i, a) => v && a.indexOf(v) === i);
  const favCats = useDb((s) => s.favourites[user.id] ?? []);
  const recommended = useMemo(() => {
    // transparent rule-based picks: favourite stalls first, then shortest current wait, available only
    const favStalls = new Set(favCats.map((id) => items[id]?.stallId));
    return Object.values(items)
      .filter((i) => i.isAvailable && stalls[i.stallId].isOpen && !favCats.includes(i.id))
      .map((i) => ({ i, score: (favStalls.has(i.stallId) ? -20 : 0) + (live[i.stallId].wait ?? 99) + i.prep / 3 }))
      .sort((a, b) => a.score - b.score)
      .filter((x, _, arr) => arr.filter((y) => y.i.stallId === x.i.stallId).indexOf(x) < 2) // max 2 per stall
      .slice(0, 6)
      .map((x) => x.i);
  }, [items, stalls, live, favCats]);

  const activeLine = active && (() => {
    const first = active.items[0].name + (active.items.length > 1 ? ` + ${active.items.length - 1} more` : '');
    const mins = active.estimatedReadyAt ? Math.max(0, Math.round((active.estimatedReadyAt - Date.now()) / 60000)) : null;
    switch (active.status) {
      case 'pending': return { t: `Your ${first} order was sent to ${active.stallName}.`, s: 'Waiting for the stall to confirm.' };
      case 'accepted': return { t: `${active.stallName} accepted your ${first}.`, s: mins != null ? `Estimated ready in ${mins} min.` : '' };
      case 'preparing': return { t: `Your ${first} is being prepared.`, s: mins != null ? `Estimated ready in ${mins} min.` : '' };
      default: return { t: `Your ${first} is ready!`, s: `Show pickup code ${active.pickupCode} at the stall.` };
    }
  })();

  return (
    <div className="container-app page-x">
      {/* header */}
      <header className="flex items-start justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="text-[13px] text-ink-muted">{greeting()}</p>
          <h1 className="font-display text-[23px] font-bold leading-tight">Hungry, {firstName(user.fullName)}? 👋</h1>
          <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-muted"><MapPin className="h-3.5 w-3.5" />APU Campus Cafeteria</p>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <BellButton />
          <CartIconButton />
          <Link to="/profile" aria-label="Profile" className="hidden sm:block"><Avatar name={user.fullName} url={user.avatarUrl} /></Link>
        </div>
      </header>

      <div className="mt-4 lg:max-w-xl">
        <SearchBar onClick={() => nav('/search')} onFilter={() => nav('/search?filters=1')} />
      </div>

      {active && activeLine && (
        <Link to={`/track/${active.id}`} className={cx('mt-5 flex items-center gap-3 rounded-[18px] p-4 shadow-card animate-slideUp', active.status === 'ready' ? 'bg-ok-bg' : 'bg-ink text-white')}>
          <span className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', active.status === 'ready' ? 'bg-ok text-white' : 'bg-brand text-ink')}>
            <ChefHat className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-semibold leading-snug">{activeLine.t}</p>
            {activeLine.s && <p className={cx('text-[13px]', active.status === 'ready' ? 'text-[#166534]' : 'text-white/70')}>{activeLine.s}</p>}
          </div>
          <span className={cx('hidden h-10 items-center rounded-[10px] px-3 font-display text-[13px] font-semibold sm:flex', active.status === 'ready' ? 'bg-white' : 'bg-brand text-ink')}>Track Order</span>
          <ArrowRight className="h-5 w-5 sm:hidden" />
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* hero */}
        <section className="relative flex min-h-[180px] items-center overflow-hidden rounded-banner bg-brand p-5">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/25" />
          <div className="relative z-10 max-w-[calc(100%-118px)] sm:max-w-[calc(100%-210px)]">
            <h2 className="font-display text-[23px] font-bold leading-[1.2]">Good Food, Zero Hassle!</h2>
            <p className="mt-1.5 text-[13px] leading-snug">Explore your campus favourites and order in just a few taps.</p>
            <Button variant="white" size="sm" className="mt-4 h-10 shadow-card" onClick={() => nav('/explore')}>Explore Menu <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <Img src={items['wes-01']?.imageUrl} alt="Spaghetti Bolognese" className="absolute -right-8 bottom-[-14px] h-[150px] w-[150px] rotate-[-8deg] border-[5px] border-white shadow-float sm:right-6 sm:h-[180px] sm:w-[180px] sm:border-[6px]" rounded="rounded-full" />
        </section>

        {/* smart shortcuts */}
        <section className="grid grid-cols-2 gap-3" aria-label="Smart shortcuts">
          {[
            { to: '/search?max=10', icon: Wallet, title: 'Eating on a Budget?', sub: 'Meals under RM 10', img: items['mam-01']?.imageUrl },
            { to: '/search?time=15', icon: Timer, title: 'Class in 15 min?', sub: 'Quick meal finder', img: items['sha-01']?.imageUrl },
          ].map(({ to, icon: Icon, title, sub, img }) => (
            <Link key={to} to={to} className="group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[18px] bg-brand-pale p-4 ring-1 ring-brand/40 press lift">
              <Img src={img} alt="" className="pointer-events-none absolute -right-5 -top-5 hidden h-24 w-24 rotate-12 border-4 border-white shadow-card lg:block" rounded="rounded-full" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"><Icon className="h-5 w-5" /></span>
              <span className="relative">
                <span className="mt-3 block font-display text-[15px] font-bold leading-tight lg:text-[17px]">{title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-muted">{sub}<ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
              </span>
            </Link>
          ))}
        </section>
      </div>

      {/* categories */}
      <section className="mt-8">
        <SectionHeader title="What Would You Like to Eat?" action={<Link to="/explore" className="text-[13px] font-semibold link-accent">See All</Link>} />
        <div className="scroll-x -mx-5 px-5 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:overflow-visible">
          {CATEGORY_ORDER.map((id) => <CategoryCard key={id} id={id} name={stalls[id].name} />)}
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        {/* live snapshot */}
        <section>
          <SectionHeader title="Cafeteria Live Status" sub="Find the best time to grab your meal." />
          <div className="rounded-[18px] bg-white p-3 shadow-card">
            {loading ? (
              <div className="space-y-3 p-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <>
                <div className="mx-1 mb-1 flex items-center gap-2 rounded-[12px] bg-brand-pale px-3 py-2.5">
                  <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative h-2.5 w-2.5 rounded-full bg-ok" /></span>
                  <p className="text-[13px] font-medium">
                    {openLive.length === 0 ? 'No stalls are taking orders right now.' : <><b>{lowCount}</b> stall{lowCount === 1 ? ' is' : 's are'} less busy right now.</>}
                  </p>
                </div>
                {snapRows.map((l) => <LiveStatusRow key={l!.stall.id} live={l!} />)}
                <p className="px-2 pt-1 text-[11px] text-ink-muted">Estimated from digital orders (includes simulated demo traffic).</p>
                <Link to="/live" className="mt-2 flex h-11 items-center justify-center gap-1 rounded-[12px] font-display text-[14px] font-semibold hover:bg-surface-alt">View All Live Status <ArrowRight className="h-4 w-4" /></Link>
              </>
            )}
          </div>
        </section>

        {/* featured */}
        <section className="min-w-0">
          <SectionHeader title="Featured Picks" sub="Hand-picked from every stall" />
          <div className="scroll-x -mx-5 px-5 sm:mx-0 sm:px-0">
            {loading
              ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[240px] w-[175px] shrink-0" />)
              : FEATURED.map((id) => items[id] && <FoodCard key={id} item={items[id]} />)}
          </div>
        </section>
      </div>

      {/* order again / recommended */}
      {past.length > 0 ? (
        <section className="mt-8">
          <SectionHeader title="Order Again?" sub="Your recent campus meals" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-card bg-white p-3 shadow-card">
                <Img src={items[o.items[0].menuItemId]?.imageUrl} alt={o.items[0].name} label={o.items[0].name} className="h-16 w-16 shrink-0" rounded="rounded-[12px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold">{o.items.map((i) => i.name).join(', ')}</p>
                  <p className="text-[12px] text-ink-muted">{o.stallName} · {rm(o.total)} last time</p>
                </div>
                <Button size="sm" variant="secondary" icon={<RotateCcw className="h-4 w-4" />} onClick={() => {
                  const r = reorder(user.id, o.id, true);
                  if (!r.ok) return toast(r.error, 'error');
                  const notes = [...r.data.unavailable.map((n) => `${n} unavailable`), ...r.data.priceChanged];
                  toast(notes.length ? `Added to cart. ${notes.join('; ')}` : 'Added to cart at current prices', notes.length ? 'info' : 'success');
                  nav('/cart');
                }}>Reorder</Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHeader title="Recommended for You" sub="Based on your favourites and current stall wait times" />
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {recommended.map((i) => <FoodCard key={i.id} item={i} width="w-full" />)}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-muted"><Sparkles className="h-3.5 w-3.5" />Simple rule-based picks — not a guarantee of availability or wait.</p>
      </section>

      {/* tip */}
      {snapshot[0] && (
        <section className="mt-8 flex items-center gap-4 rounded-[18px] bg-brand-soft p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white"><Clock className="h-6 w-6" /></span>
          <div className="flex-1">
            <p className="font-display text-[15px] font-bold">Only 15 minutes before class?</p>
            <p className="text-[13px] text-ink-muted">{snapshot[0].stall.name} currently has the shortest estimated wait ({waitRange(snapshot[0].wait)}).</p>
          </div>
          <Link to={`/stall/${snapshot[0].stall.id}`} className="shrink-0 rounded-[10px] bg-white px-3 py-2 font-display text-[13px] font-semibold shadow-sm">Go</Link>
        </section>
      )}
    </div>
  );
}
