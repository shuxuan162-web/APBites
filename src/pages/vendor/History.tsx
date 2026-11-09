import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ClipboardList, Timer, XCircle } from 'lucide-react';
import { DemoTag, OrderStatusBadge } from '../../components/ui';
import { useVendor, VHeader, Kpi } from './common';
import { clock, rm } from './format';
import { dateShort } from '../../lib/format';

const Y = '#FFDA03';
const INK = '#202124';
const GRID = '#EEF0F3';
const tip = { contentStyle: { borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13, fontFamily: 'Inter' }, cursor: { fill: '#FFF8D6' } };

export default function VendorHistory() {
  const { orders } = useVendor();
  const data = useMemo(() => {
    const done = orders.filter((o) => o.status === 'collected');
    const cancelled = orders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
    const timed = done.filter((o) => o.timeline.preparing && o.timeline.ready).map((o) => (o.timeline.ready! - o.timeline.preparing!) / 60000).filter((m) => m > 0 && m < 120);
    const byHour = Array.from({ length: 14 }, (_, k) => ({ hour: `${(k + 7) % 12 || 12}${k + 7 < 12 ? 'a' : 'p'}`, h: k + 7, orders: 0 }));
    orders.forEach((o) => { const h = new Date(o.createdAt).getHours(); const b = byHour.find((x) => x.h === h); if (b) b.orders++; });
    const byDay = Array.from({ length: 8 }, (_, k) => {
      const d = new Date(Date.now() - (7 - k) * 864e5);
      return { key: d.toDateString(), day: k === 7 ? 'Today' : d.toLocaleDateString('en-MY', { weekday: 'short' }), orders: 0 };
    });
    orders.forEach((o) => { const b = byDay.find((x) => x.key === new Date(o.createdAt).toDateString()); if (b) b.orders++; });
    const counts: Record<string, number> = {};
    done.forEach((o) => o.items.forEach((i) => (counts[i.name] = (counts[i.name] ?? 0) + i.quantity)));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }));
    const peak = [...byHour].sort((a, b) => b.orders - a.orders)[0];
    return { done, cancelled, avg: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length) : null, byHour, byDay, top, peak, sim: orders.some((o) => o.simulated) };
  }, [orders]);
  const recent = [...data.done, ...data.cancelled].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);

  return (
    <>
      <VHeader title="Order History & Analytics" subtitle="Last 7 days" right={data.sim ? <DemoTag>Includes simulated demo data</DemoTag> : undefined} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<ClipboardList className="h-5 w-5" />} label="Total orders" value={orders.length} />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="Completed" value={data.done.length} />
        <Kpi icon={<XCircle className="h-5 w-5" />} label="Cancelled / rejected" value={data.cancelled.length} />
        <Kpi icon={<Timer className="h-5 w-5" />} label="Avg. prep time" value={data.avg != null ? `${data.avg}m` : '—'} sub={data.peak?.orders ? `Peak hour: ${data.peak.hour}` : undefined} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="h-card mb-4">Orders by Hour</h2>
          <div className="h-56"><ResponsiveContainer><BarChart data={data.byHour}><CartesianGrid vertical={false} stroke={GRID} /><XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} /><Tooltip {...tip} /><Bar dataKey="orders" fill={Y} radius={[6, 6, 0, 0]} maxBarSize={32} /></BarChart></ResponsiveContainer></div>
        </section>
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="h-card mb-4">Orders by Day</h2>
          <div className="h-56"><ResponsiveContainer><LineChart data={data.byDay}><CartesianGrid vertical={false} stroke={GRID} /><XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} /><Tooltip {...tip} cursor={{ stroke: '#E5E7EB' }} /><Line type="monotone" dataKey="orders" stroke={INK} strokeWidth={2.5} dot={{ r: 4, fill: Y, stroke: INK, strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div>
        </section>
        <section className="rounded-card bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="h-card mb-4">Most Ordered Items</h2>
          <div className="h-64"><ResponsiveContainer><BarChart data={data.top} layout="vertical" margin={{ left: 10 }}><CartesianGrid horizontal={false} stroke={GRID} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><YAxis type="category" dataKey="name" width={170} tickLine={false} axisLine={false} fontSize={12} /><Tooltip {...tip} /><Bar dataKey="qty" name="Qty sold" fill={Y} radius={[0, 6, 6, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
        </section>
      </div>
      <section className="mt-6 overflow-hidden rounded-card bg-white shadow-card">
        <h2 className="h-card p-5 pb-3">Recent completed & cancelled</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead className="bg-surface-alt text-left text-[12px] text-ink-muted"><tr><th className="px-5 py-2.5 font-semibold">Order</th><th className="px-5 py-2.5 font-semibold">Date</th><th className="px-5 py-2.5 font-semibold">Items</th><th className="px-5 py-2.5 font-semibold">Total</th><th className="px-5 py-2.5 font-semibold">Status</th></tr></thead>
            <tbody>{recent.map((o) => (
              <tr key={o.id} className="border-t border-line"><td className="px-5 py-2.5 font-semibold tabular-nums">{o.orderNumber}{o.simulated && <span className="ml-1 text-[11px] font-normal text-ink-faint">(sim)</span>}</td><td className="px-5 py-2.5 text-ink-muted">{dateShort(o.createdAt)} {clock(o.createdAt)}</td><td className="px-5 py-2.5">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td><td className="px-5 py-2.5 tabular-nums">{rm(o.total)}</td><td className="px-5 py-2.5"><OrderStatusBadge status={o.status} /></td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
