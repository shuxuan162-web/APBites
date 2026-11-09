import { useMemo } from 'react';
import { Minus, Plus } from 'lucide-react';
import { toast } from '../../store/session';
import { updateStall } from '../../services/api';
import { timeAgo, waitRange } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import { Badge, LevelBadge, Toggle, cx, DemoTag } from '../../components/ui';
import { useVendor, VHeader } from './common';
import type { Stall, WorkloadLevel } from '../../lib/types';

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-alt disabled:opacity-40"><Minus className="h-4 w-4" /></button>
      <span className="w-8 text-center font-display text-[20px] font-bold tabular-nums">{value}</span>
      <button aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-brand disabled:opacity-40"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export default function StatusManagement() {
  const { user, stall, orders, live } = useVendor();
  const now = useNow(10000);
  const save = async (patch: Parameters<typeof updateStall>[1], msg: string) => {
    const r = await updateStall(user.id, patch);
    toast(r.ok ? msg : r.error, r.ok ? 'success' : 'error');
  };
  const avg = useMemo(() => {
    const done = orders.filter((o) => o.timeline.preparing && o.timeline.ready).map((o) => (o.timeline.ready! - o.timeline.preparing!) / 60000).filter((m) => m > 0 && m < 120);
    return { n: done.length, m: done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : null, sim: orders.some((o) => o.simulated && o.timeline.ready) };
  }, [orders]);

  const Row = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-4 last:border-0">
      <div className="min-w-[220px] flex-1"><p className="font-display text-[15px] font-semibold">{title}</p><p className="text-[13px] text-ink-muted">{desc}</p></div>
      {children}
    </div>
  );

  return (
    <>
      <VHeader title="Live Stall Status" subtitle="Control what students see on Live Status." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-card bg-white px-5 py-1 shadow-card">
          <Row title="Stall open" desc="Closed stalls are shown as Closed to students and can't receive orders.">
            <Toggle checked={stall.isOpen} onChange={(v) => save({ isOpen: v }, v ? 'Stall is now open' : 'Stall closed — students with active orders were notified')} label="Stall open" />
          </Row>
          <Row title="Accepting Orders" desc="When off, students can't submit new orders. Existing orders stay visible and manageable.">
            <Toggle checked={stall.acceptingOrders} disabled={!stall.isOpen} onChange={(v) => save({ acceptingOrders: v }, v ? 'Accepting orders' : 'New orders paused')} label="Accepting orders" />
          </Row>
          <Row title="Number of Parallel Preparation Stations" desc="How many orders your kitchen can cook at the same time. Used in the wait estimate.">
            <Stepper value={stall.capacity} min={1} max={10} label="preparation stations" onChange={(v) => save({ capacity: v }, `Capacity set to ${v}`)} />
          </Row>
          <Row title="Workload thresholds" desc={`Moderate from ${stall.thresholds.moderate} active orders, High from ${stall.thresholds.high}.`}>
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="mb-1 text-[11px] font-semibold text-warn-text">Moderate</p><Stepper value={stall.thresholds.moderate} min={1} max={stall.thresholds.high - 1} label="moderate threshold" onChange={(v) => save({ thresholds: { ...stall.thresholds, moderate: v } }, 'Thresholds updated')} /></div>
              <div className="text-center"><p className="mb-1 text-[11px] font-semibold text-bad">High</p><Stepper value={stall.thresholds.high} min={stall.thresholds.moderate + 1} max={30} label="high threshold" onChange={(v) => save({ thresholds: { ...stall.thresholds, high: v } }, 'Thresholds updated')} /></div>
            </div>
          </Row>
          <div className="py-4">
            <p className="font-display text-[15px] font-semibold">Manual Workload Adjustment</p>
            <p className="text-[13px] text-ink-muted">Seeing a long walk-in queue? Report it. Students see it labelled “Vendor-reported” for 30 minutes.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['low', 'moderate', 'high'] as WorkloadLevel[]).map((l) => (
                <button key={l} onClick={() => save({ vendorWorkload: stall.vendorWorkload === l ? null : l }, stall.vendorWorkload === l ? 'Manual report cleared' : `Reported ${l} workload`)}
                  className={cx('h-11 rounded-full px-5 font-display text-[14px] font-semibold capitalize transition', stall.vendorWorkload === l && live.load.source === 'vendor_report' ? 'bg-ink text-white' : 'bg-surface-alt hover:bg-line')}>
                  {l}
                </button>
              ))}
              {stall.vendorWorkload && live.load.source === 'vendor_report' && <button onClick={() => save({ vendorWorkload: null }, 'Manual report cleared')} className="h-11 px-3 text-[13px] link-accent">Use order estimate</button>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-card bg-brand-pale p-5 ring-1 ring-brand/50">
            <div className="flex items-center justify-between"><h2 className="h-card">Real-Time Summary</h2>{live.load.simulatedActive > 0 && <DemoTag>Incl. simulated</DemoTag>}</div>
            <dl className="mt-3 space-y-2 text-[14px]">
              {[
                ['Active Orders', live.load.active],
                ['Pending Orders', live.load.pending],
                ['Accepted (queued)', live.load.accepted],
                ['Preparing Orders', live.load.preparing],
                ['Ready for pickup', live.load.ready],
              ].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-muted">{k}</dt><dd className="font-display font-bold tabular-nums">{v}</dd></div>)}
              <div className="flex justify-between"><dt className="text-ink-muted">Estimated Wait</dt><dd className="font-display font-bold tabular-nums">{waitRange(live.wait)}</dd></div>
              <div className="flex items-center justify-between"><dt className="text-ink-muted">Shown to students</dt><dd>{stall.isOpen ? <LevelBadge level={live.load.level} /> : <Badge>Closed</Badge>}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Source</dt><dd className="font-medium">{live.load.source === 'vendor_report' ? 'Vendor report' : 'Order estimate'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">Last Updated</dt><dd className="font-medium">{timeAgo(stall.lastStatusUpdated, now)}</dd></div>
            </dl>
          </section>
          <section className="rounded-card bg-white p-5 shadow-card">
            <h2 className="h-card">Average Preparation Time</h2>
            {avg.m != null ? (
              <><p className="mt-2 font-display text-[28px] font-bold tabular-nums">{avg.m} min</p><p className="text-[12px] text-ink-muted">From {avg.n} orders timed from “Preparing” to “Ready”{avg.sim ? ', including simulated demo orders' : ''}.</p></>
            ) : <p className="mt-2 text-[13px] text-ink-muted">Not enough timed orders yet — using each item's configured prep time.</p>}
          </section>
        </aside>
      </div>
    </>
  );
}

export type { Stall };
