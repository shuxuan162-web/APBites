import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FlaskConical, RotateCcw, Zap, Trash2 } from 'lucide-react';
import { useDb } from '../store/db';
import { clearSimulatedActive, generateTraffic, resetDemo, setSimulation } from '../services/api';
import { useStallLive } from '../lib/hooks';
import { CATEGORY_ORDER, type CategoryId } from '../data/menu';
import { waitRange } from '../lib/format';
import { BackButton, Button, ConfirmationModal, LevelBadge, Toggle } from '../components/ui';
import { toast } from '../store/session';

/** Developer-only demo controls. Hidden from students (unlock: tap the version 5× on About, or via vendor Settings). */
export default function DevPanel() {
  const unlocked = useDb((s) => s.devUnlocked);
  const sim = useDb((s) => s.simulation);
  const live = useStallLive();
  const [stall, setStall] = useState<CategoryId | 'all'>('all');
  const [confirm, setConfirm] = useState(false);
  if (!unlocked) return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-12">
      <header className="flex items-center gap-2 py-4"><div className="-ml-2"><BackButton /></div><h1 className="flex items-center gap-2 h-page"><FlaskConical className="h-6 w-6" />Demo Controls</h1></header>
      <p className="mb-5 text-[14px] text-ink-muted">Developer-only tools for the hackathon demo. Everything generated here is flagged as simulated and labelled as demo data in the app.</p>

      <section className="rounded-card bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="h-card">Auto-simulate traffic</h2><p className="text-[13px] text-ink-muted">Every 20s, simulated orders advance and new ones arrive.</p></div>
          <Toggle checked={sim} onChange={(v) => { setSimulation(v); toast(v ? 'Simulation on' : 'Simulation off', 'info'); }} label="Auto-simulate traffic" />
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex-1"><span className="field-label">Stall</span>
            <select className="field h-11" value={stall} onChange={(e) => setStall(e.target.value as CategoryId | 'all')}>
              <option value="all">All stalls (random)</option>
              {CATEGORY_ORDER.map((id) => <option key={id} value={id}>{live[id].stall.name}</option>)}
            </select>
          </label>
          <Button size="md" icon={<Zap className="h-4 w-4" />} onClick={() => { generateTraffic(stall, 3); toast('Added 3 simulated orders'); }}>+3 orders</Button>
          <Button size="md" variant="secondary" icon={<Trash2 className="h-4 w-4" />} onClick={() => { clearSimulatedActive(stall); toast('Simulated active orders cleared', 'info'); }}>Clear simulated</Button>
        </div>
      </section>

      <section className="mt-5 rounded-card bg-white p-5 shadow-card">
        <h2 className="h-card mb-3">Current workload</h2>
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-ink-muted"><th className="pb-2 font-medium">Stall</th><th className="pb-2 font-medium">Active (sim)</th><th className="pb-2 font-medium">Level</th><th className="pb-2 text-right font-medium">Est. wait</th></tr></thead>
          <tbody>{live.list.map((l) => (
            <tr key={l.stall.id} className="border-t border-line"><td className="py-2">{l.stall.name}</td><td className="py-2 tabular-nums">{l.load.active} ({l.load.simulatedActive})</td><td className="py-2"><LevelBadge level={l.load.level} short /></td><td className="py-2 text-right tabular-nums">{waitRange(l.wait)}</td></tr>
          ))}</tbody>
        </table>
      </section>

      <section className="mt-5 rounded-card border border-bad/30 bg-bad-bg/40 p-5">
        <h2 className="h-card">Reset demo</h2>
        <p className="text-[13px] text-ink-muted">Restores all stalls, 80 menu items, seeded history and accounts. Removes new accounts, orders and notifications.</p>
        <Button size="md" variant="danger" className="mt-3" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirm(true)}>Reset demo data</Button>
      </section>
      <p className="mt-6 text-center text-[13px]"><Link to="/" className="link-accent">Back to app</Link></p>
      <ConfirmationModal open={confirm} title="Reset demo data?" description="This permanently replaces all data in this browser with the original demo seed. Signed-in sessions stay signed in." confirmLabel="Reset" tone="danger"
        onCancel={() => setConfirm(false)} onConfirm={() => { resetDemo(); setConfirm(false); toast('Demo data reset'); }} />
    </div>
  );
}
