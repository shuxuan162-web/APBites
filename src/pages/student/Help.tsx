import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCurrentUser } from '../../store/session';
import { submitSupport } from '../../services/api';
import { Button, Field, InlineAlert, PageHeader, cx } from '../../components/ui';

const FAQ = [
  ['How do I place an order?', 'Browse a stall, select your food, add it to your cart, and complete checkout.'],
  ['How do I know when my food is ready?', 'Track your order in the Orders section. You will also get a notification with your pickup code when the stall marks it ready.'],
  ['Can I cancel an order?', "Cancellation depends on the order's current status and stall policy. In APBites you can cancel until the stall accepts your order."],
  ['How is waiting time calculated?', 'Waiting time is estimated using current digital orders, preparation times, and stall capacity (the number of parallel preparation stations).'],
  ['Does the Live Status show actual physical crowds?', 'In the MVP, it shows estimated stall busyness based on available order data. Physical crowd measurement requires additional validated data sources.'],
  ['Can I order from multiple stalls?', 'For the initial MVP, each order is placed with one stall.'],
];

export default function Help() {
  const user = useCurrentUser()!;
  const [open, setOpen] = useState<number | null>(0);
  const [f, setF] = useState({ subject: '', message: '', orderNumber: '' });
  const [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="container-app page-x max-w-2xl">
      <PageHeader title="Help & Support" subtitle="We're here to make your campus dining easier." back />
      <h2 className="h-section mb-3">Frequently asked</h2>
      <div className="space-y-2.5">
        {FAQ.map(([q, a], i) => (
          <div key={q} className="overflow-hidden rounded-card bg-white shadow-card">
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left">
              <span className="flex-1 font-display text-[15px] font-semibold">{q}</span>
              <ChevronDown className={cx('h-5 w-5 shrink-0 transition-transform', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-4 pb-4 text-[14px] text-ink-muted animate-slideUp">{a}</p>}
          </div>
        ))}
      </div>

      <h2 className="h-section mb-1 mt-8">Contact support</h2>
      <p className="mb-4 text-[13px] text-ink-muted">Demo mode: your request is saved in this prototype's database; no staff member receives it yet.</p>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const r = await submitSupport(user.id, f);
        setLoading(false);
        setRes(r.ok ? { ok: true, msg: `Request saved (ref ${r.data.slice(-6).toUpperCase()}).` } : { ok: false, msg: r.error });
        if (r.ok) setF({ subject: '', message: '', orderNumber: '' });
      }}>
        <Field id="subj" label="Subject"><input id="subj" className="field" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="What do you need help with?" /></Field>
        <Field id="msg" label="Message"><textarea id="msg" rows={4} className="field h-auto py-3" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tell us a bit more…" /></Field>
        <Field id="ord" label="Order Number (optional)"><input id="ord" className="field" value={f.orderNumber} onChange={(e) => setF({ ...f, orderNumber: e.target.value })} placeholder="e.g. APB-000128" /></Field>
        {res && <InlineAlert tone={res.ok ? 'ok' : 'error'}>{res.msg}</InlineAlert>}
        <Button type="submit" full loading={loading}>Submit Request</Button>
      </form>
    </div>
  );
}
