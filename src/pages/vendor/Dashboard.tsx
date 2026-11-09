import { useNavigate } from 'react-router-dom';
import { ChefHat, CheckCircle2, ClipboardList, Hourglass, Wallet, ArrowRight, Gauge, UtensilsCrossed } from 'lucide-react';
import { Button, DemoTag, LevelBadge, OpenBadge } from '../../components/ui';
import { useVendor, VHeader, Kpi, VendorOrderCard } from './common';
import { isToday, rm } from './format';
import { waitRange } from '../../lib/format';

export default function VendorDashboard() {
  const { stall, orders, live } = useVendor();
  const nav = useNavigate();
  const today = orders.filter((o) => isToday(o.createdAt));
  const pending = orders.filter((o) => o.status === 'pending');
  const preparing = orders.filter((o) => o.status === 'preparing');
  const completed = today.filter((o) => o.status === 'collected');
  const value = completed.reduce((s, o) => s + o.total, 0);
  const demoPaid = completed.filter((o) => o.paymentMethod === 'demo_online').reduce((s, o) => s + o.total, 0);
  const anySim = today.some((o) => o.simulated);

  return (
    <>
      <VHeader title="Vendor Dashboard" subtitle="Manage your stall and keep orders moving." right={<div className="flex items-center gap-2"><span className="font-display text-[15px] font-semibold">{stall.name}</span><OpenBadge isOpen={stall.isOpen} accepting={stall.acceptingOrders} /></div>} />
      {anySim && <p className="-mt-3 mb-4"><DemoTag>Figures include simulated demo orders</DemoTag></p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi icon={<ClipboardList className="h-5 w-5" />} label="Today's Orders" value={today.length} />
        <Kpi icon={<Hourglass className="h-5 w-5" />} label="Pending Orders" value={pending.length} />
        <Kpi icon={<ChefHat className="h-5 w-5" />} label="Preparing Orders" value={preparing.length} />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Completed Today" value={completed.length} />
        <div className="col-span-2 lg:col-span-1"><Kpi icon={<Wallet className="h-5 w-5" />} label="Collected order value" value={<span className="text-[22px]">{rm(value)}</span>} sub={`${rm(demoPaid)} demo-paid · ${rm(value - demoPaid)} pay-at-counter`} /></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="h-card">Current Workload</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[12px] bg-surface-alt p-3"><p className="text-[12px] text-ink-muted">Order workload</p><div className="mt-1"><LevelBadge level={live.load.level} /></div></div>
            <div className="rounded-[12px] bg-surface-alt p-3"><p className="text-[12px] text-ink-muted">Wait for new order</p><p className="font-display text-[18px] font-bold tabular-nums">{waitRange(live.wait)}</p></div>
            <div className="rounded-[12px] bg-surface-alt p-3"><p className="text-[12px] text-ink-muted">Active orders</p><p className="font-display text-[18px] font-bold tabular-nums">{live.load.active}</p></div>
            <div className="rounded-[12px] bg-surface-alt p-3"><p className="text-[12px] text-ink-muted">Prep stations</p><p className="font-display text-[18px] font-bold tabular-nums">{stall.capacity}</p></div>
          </div>
          <p className="mt-3 text-[12px] text-ink-muted">{live.load.source === 'vendor_report' ? 'Showing your manual workload report to students.' : 'Calculated from app orders and your stall capacity.'}</p>
          <div className="mt-4 grid gap-2">
            <Button size="md" full icon={<ClipboardList className="h-4 w-4" />} onClick={() => nav('/vendor/orders')}>View Incoming Orders</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="md" variant="secondary" icon={<UtensilsCrossed className="h-4 w-4" />} onClick={() => nav('/vendor/menu')}>Manage Menu</Button>
              <Button size="md" variant="secondary" icon={<Gauge className="h-4 w-4" />} onClick={() => nav('/vendor/status')}>Update Status</Button>
            </div>
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="h-card">New orders</h2><button onClick={() => nav('/vendor/orders')} className="flex items-center gap-1 text-[13px] link-accent">All orders <ArrowRight className="h-3.5 w-3.5" /></button></div>
          <div className="space-y-3">
            {pending.slice(0, 3).map((o) => <VendorOrderCard key={o.id} order={o} compact />)}
            {!pending.length && <p className="rounded-card bg-white p-6 text-center text-[14px] text-ink-muted shadow-card">No new orders right now. New orders appear here instantly.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
