import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Leaf, LogOut } from 'lucide-react';
import { useSession, toast } from '../../store/session';
import { unlockDev, updateStall } from '../../services/api';
import { Button, ConfirmationModal, Toggle } from '../../components/ui';
import { useVendor, VHeader } from './common';

export default function VendorSettings() {
  const { user, stall } = useVendor();
  const nav = useNavigate();
  const signOut = useSession((s) => s.signOut);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <VHeader title="Settings" subtitle="Stall profile and account" />
      <div className="grid max-w-3xl gap-5">
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="h-card">Stall profile</h2>
          <dl className="mt-3 grid gap-3 text-[14px] sm:grid-cols-2">
            <div><dt className="text-[12px] text-ink-muted">Name</dt><dd className="font-medium">{stall.name}</dd></div>
            <div><dt className="text-[12px] text-ink-muted">Cuisine</dt><dd className="font-medium">{stall.cuisine}</dd></div>
            <div><dt className="text-[12px] text-ink-muted">Operating hours</dt><dd className="font-medium">{stall.hours.open} – {stall.hours.close}</dd></div>
            <div><dt className="text-[12px] text-ink-muted">Description</dt><dd className="font-medium">{stall.description}</dd></div>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] bg-surface-alt p-4">
            <div className="flex items-start gap-3"><Leaf className="mt-0.5 h-5 w-5 text-ok" /><div><p className="font-display text-[15px] font-semibold">Bring Your Own Container</p><p className="text-[13px] text-ink-muted">Show students that reusable containers are welcome.</p></div></div>
            <Toggle checked={stall.byoContainer} onChange={async (v) => { const r = await updateStall(user.id, { byoContainer: v }); toast(r.ok ? 'Saved' : r.error, r.ok ? 'success' : 'error'); }} label="Accept reusable containers" />
          </div>
        </section>
        <section className="rounded-card bg-white p-5 shadow-card">
          <h2 className="h-card">Account</h2>
          <p className="mt-2 text-[14px]">{user.fullName}</p>
          <p className="text-[13px] text-ink-muted">{user.email} · Vendor access limited to {stall.name}</p>
          <Button variant="secondary" size="md" className="mt-4 !border-bad/40 !text-bad" icon={<LogOut className="h-4 w-4" />} onClick={() => setConfirm(true)}>Log Out</Button>
        </section>
        <section className="rounded-card border border-dashed border-ink/25 bg-brand-pale p-5">
          <h2 className="flex items-center gap-2 h-card"><FlaskConical className="h-5 w-5" />Hackathon demo controls</h2>
          <p className="mt-1 text-[13px] text-ink-muted">Generate simulated orders, toggle auto traffic, or reset all demo data. Not visible to students.</p>
          <Button size="md" variant="dark" className="mt-3" onClick={() => { unlockDev(); nav('/dev'); }}>Open demo controls</Button>
        </section>
      </div>
      <ConfirmationModal open={confirm} title="Log Out?" description="Are you sure you want to sign out of APBites?" confirmLabel="Log Out" tone="danger" onCancel={() => setConfirm(false)} onConfirm={() => { signOut(); nav('/login', { replace: true }); }} />
    </>
  );
}
