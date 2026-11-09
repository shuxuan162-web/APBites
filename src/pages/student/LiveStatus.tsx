import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, Info, RefreshCw, Users, Zap } from 'lucide-react';
import { useDb } from '../../store/db';
import { useNow, useOnline, useStallLive } from '../../lib/hooks';
import { timeAgo, waitRange } from '../../lib/format';
import { LEVEL_META, overallLevel } from '../../lib/waitTime';
import { Badge, Button, DemoTag, Img, LevelBadge, OpenBadge, PageHeader, cx } from '../../components/ui';

const POLL_MS = 20000;

export default function LiveStatus() {
  const live = useStallLive();
  const nav = useNavigate();
  const online = useOnline();
  const updatedAt = useDb((s) => s.updatedAt);
  const simulation = useDb((s) => s.simulation);
  const now = useNow(5000);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [spinning, setSpinning] = useState(false);

  // Data changes arrive via realtime sync; we also poll every 20s.
  useEffect(() => { if (online) setFetchedAt(Date.now()); }, [updatedAt, online]);
  useEffect(() => {
    const t = setInterval(() => {
      if (navigator.onLine) {
        useDb.persist.rehydrate();
        setFetchedAt(Date.now());
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const refresh = () => {
    setSpinning(true);
    useDb.persist.rehydrate();
    if (online) setFetchedAt(Date.now());
    setTimeout(() => setSpinning(false), 500);
  };

  const stale = !online || now - fetchedAt > 2 * 60000;
  const open = live.list.filter((l) => l.stall.isOpen);
  const overall = overallLevel(open.map((l) => l.load.level));
  const totalActive = live.list.reduce((s, l) => s + l.load.active, 0);
  const simActive = live.list.reduce((s, l) => s + l.load.simulatedActive, 0);
  const recommended = useMemo(
    () => live.list.filter((l) => l.stall.isOpen && l.stall.acceptingOrders && l.wait != null).sort((a, b) => a.wait! - b.wait!).slice(0, 3),
    [live],
  );
  const sorted = [...live.list].sort((a, b) => Number(b.stall.isOpen) - Number(a.stall.isOpen) || (a.wait ?? 999) - (b.wait ?? 999));
  const overallCopy = {
    low: ['Quiet Right Now', 'Most stalls have short estimated waits. Great time to order!'],
    moderate: ['Moderately Busy', 'Some stalls may have longer waiting times.'],
    high: ['Very Busy', 'Expect longer waits at most stalls — consider ordering ahead.'],
  }[overall];
  const meter = { low: 'w-1/3 bg-ok', moderate: 'w-2/3 bg-warn', high: 'w-full bg-bad' }[overall];

  return (
    <div className="container-app page-x">
      <PageHeader title="Live Cafeteria Status" subtitle="Find your food without the long wait." />

      <div className="-mt-1 mb-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium" aria-live="polite">
          <span className={cx('h-2.5 w-2.5 rounded-full', stale ? 'bg-warn' : 'bg-ok')} />
          Updated {timeAgo(fetchedAt, now)}
        </span>
        <button onClick={refresh} className="flex h-9 items-center gap-1.5 rounded-full bg-surface-alt px-3 text-[13px] font-semibold hover:bg-line">
          <RefreshCw className={cx('h-4 w-4', spinning && 'animate-spin')} /> Refresh
        </button>
        {simActive > 0 && <DemoTag>{simulation ? 'Simulated traffic running' : 'Includes simulated demo orders'}</DemoTag>}
      </div>
      {stale && <p className="mb-4 rounded-[12px] bg-warn-bg px-3.5 py-2.5 text-[13px] font-medium text-warn-text">Live information may be outdated{!online ? ' — you are offline' : ''}.</p>}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="relative overflow-hidden rounded-banner bg-brand p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/25" />
          <p className="flex items-center gap-1.5 font-display text-[14px] font-semibold"><Activity className="h-4 w-4" />How Busy Is the Cafeteria?</p>
          <h2 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{open.length ? overallCopy[0] : 'All Stalls Closed'}</h2>
          <p className="mt-1 text-[14px]">{open.length ? overallCopy[1] : 'Check back during opening hours.'}</p>
          <div className="mt-4 h-2.5 rounded-full bg-white/60" role="meter" aria-label="Overall order workload" aria-valuetext={LEVEL_META[overall].short}>
            <div className={cx('h-2.5 rounded-full transition-all duration-500', meter)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[13px] font-medium">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{totalActive} active app orders</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" />{open.length}/8 stalls open</span>
          </div>
          <p className="mt-3 text-[11px] opacity-80">Current order workload from app orders — not a count of people physically queuing.</p>
        </section>

        <section className="rounded-banner bg-white p-5 shadow-card">
          <h2 className="font-display text-[18px] font-bold">Want to Skip the Crowd?</h2>
          <p className="text-[13px] text-ink-muted">Shortest estimated waits right now</p>
          {recommended.length ? (
            <ol className="mt-3 space-y-2.5">
              {recommended.map((l, i) => (
                <li key={l.stall.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-[13px] font-bold">{i + 1}</span>
                  <Img src={l.stall.imageUrl} alt="" label={l.stall.name} className="h-11 w-11 shrink-0" rounded="rounded-[12px]" />
                  <div className="min-w-0 flex-1"><p className="truncate font-display text-[15px] font-semibold">{l.stall.name}</p><p className="text-[12px] text-ink-muted tabular-nums">{waitRange(l.wait)} · {LEVEL_META[l.load.level].short}</p></div>
                  <Button size="sm" variant="secondary" onClick={() => nav(`/stall/${l.stall.id}`)} aria-label={`Explore ${l.stall.name}`}>Explore</Button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 rounded-[12px] bg-surface-alt p-4 text-[14px] text-ink-muted">No estimates are available right now — stalls may be closed or paused. Check back soon!</p>
          )}
        </section>
      </div>

      <h2 className="h-section mb-3 mt-8">All Stalls</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sorted.map(({ stall, load, wait }) => (
          <article key={stall.id} className={cx('flex flex-col overflow-hidden rounded-stall bg-white shadow-card', !stall.isOpen && 'opacity-80')}>
            <div className="relative">
              <Img src={stall.imageUrl} alt={`${stall.name} stall`} label={stall.name} className={cx('h-[110px] w-full', !stall.isOpen && 'grayscale')} />
              <div className="absolute left-3 top-3"><OpenBadge isOpen={stall.isOpen} accepting={stall.acceptingOrders} /></div>
              {load.source === 'vendor_report' && <div className="absolute right-3 top-3"><Badge tone="dark">Vendor-reported</Badge></div>}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3 className="h-card">{stall.name}</h3>
              {stall.isOpen ? (
                <>
                  <div className="mt-2"><LevelBadge level={load.level} /></div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                    <div className="rounded-[10px] bg-surface-alt p-2"><dt className="flex items-center gap-1 text-ink-muted"><Clock className="h-3 w-3" />Est. wait</dt><dd className="font-display text-[15px] font-bold tabular-nums">{stall.acceptingOrders ? waitRange(wait) : 'Paused'}</dd></div>
                    <div className="rounded-[10px] bg-surface-alt p-2"><dt className="text-ink-muted">Active orders</dt><dd className="font-display text-[15px] font-bold tabular-nums">{load.active}</dd></div>
                  </dl>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-ink-muted">Closed · usual hours {stall.hours.open}–{stall.hours.close}</p>
              )}
              <Button size="md" variant="secondary" full className="mt-4" onClick={() => nav(`/stall/${stall.id}`)}>View Menu</Button>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-[18px] bg-surface-alt p-5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold"><Info className="h-[18px] w-[18px]" />How we estimate</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-muted">
          <li><b className="text-ink">Workload</b> is based on each stall's active app orders against stall-specific thresholds set by the vendor.</li>
          <li><b className="text-ink">Estimated wait</b> = queued preparation time ÷ the stall's parallel preparation stations + a typical dish's prep time.</li>
          <li>Vendors can report their workload manually; it's shown as "Vendor-reported" for 30 minutes.</li>
          <li>Physical crowd sensors aren't connected yet, so walk-in queues aren't counted. Demo orders from simulated customers are included.</li>
        </ul>
      </section>
    </div>
  );
}
