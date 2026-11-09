import { useState } from 'react';
import { Pencil, Plus, Trash2, ImagePlus } from 'lucide-react';
import { useDb } from '../../store/db';
import { toast } from '../../store/session';
import { deleteItem, setAvailability, upsertItem } from '../../services/api';
import { rm } from '../../lib/format';
import { Button, ConfirmationModal, Field, Img, InlineAlert, Modal, Toggle } from '../../components/ui';
import { useVendor, VHeader } from './common';
import type { MenuItem } from '../../lib/types';

type Draft = { id?: string; name: string; description: string; price: string; ingredients: string; prep: string; imageUrl?: string; isAvailable: boolean };
const blank: Draft = { name: '', description: '', price: '', ingredients: '', prep: '8', isAvailable: true };

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 480;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const m = Math.min(img.width, img.height);
      c.getContext('2d')!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function MenuManagement() {
  const { user, stallId, stall } = useVendor();
  const items = useDb((s) => s.items);
  const menu = Object.values(items).filter((i) => i.stallId === stallId).sort((a, b) => a.name.localeCompare(b.name));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState<MenuItem | null>(null);

  const edit = (i: MenuItem) => setDraft({ id: i.id, name: i.name, description: i.description, price: i.price.toFixed(2), ingredients: (i.ingredients ?? []).join(', '), prep: String(i.prep), imageUrl: i.imageUrl, isAvailable: i.isAvailable });
  const save = async () => {
    if (!draft) return;
    setErr('');
    const price = Number(draft.price);
    const prep = Number(draft.prep);
    if (!draft.name.trim()) return setErr('Food name is required.');
    if (draft.price === '' || Number.isNaN(price) || price < 0) return setErr('Price must be a number of zero or more.');
    if (Number.isNaN(prep) || prep <= 0) return setErr('Preparation time must be greater than zero.');
    setSaving(true);
    const r = await upsertItem(user.id, { id: draft.id, name: draft.name, description: draft.description, price, prep, imageUrl: draft.imageUrl, isAvailable: draft.isAvailable, ingredients: draft.ingredients.split(',').map((s) => s.trim()).filter(Boolean) });
    setSaving(false);
    if (!r.ok) return setErr(r.error);
    toast(draft.id ? 'Item updated' : 'Item added to menu');
    setDraft(null);
  };
  const toggle = async (i: MenuItem, v: boolean) => {
    const r = await setAvailability(user.id, i.id, v);
    toast(r.ok ? `${i.name} marked ${v ? 'available' : 'sold out'}` : r.error, r.ok ? 'info' : 'error');
  };

  return (
    <>
      <VHeader title="Menu Management" subtitle={`${menu.length} items · changes appear on the student menu instantly`} right={<Button size="md" icon={<Plus className="h-4 w-4" />} onClick={() => { setErr(''); setDraft({ ...blank }); }}>Add New Food</Button>} />
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <table className="hidden w-full text-[14px] md:table">
          <thead className="bg-surface-alt text-left text-[12px] text-ink-muted"><tr><th className="px-4 py-3 font-semibold">Food</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Prep</th><th className="px-4 py-3 font-semibold">Availability</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
          <tbody>
            {menu.map((i) => (
              <tr key={i.id} className="border-t border-line">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Img src={i.imageUrl} alt="" label={i.name} sold={!i.isAvailable} className="h-12 w-12 shrink-0" rounded="rounded-[10px]" /><div className="min-w-0"><p className="font-display font-semibold">{i.name}</p><p className="line-clamp-1 max-w-sm text-[12px] text-ink-muted">{i.description}</p></div></div></td>
                <td className="px-4 py-3 font-display font-bold tabular-nums">{rm(i.price)}</td>
                <td className="px-4 py-3 tabular-nums text-ink-muted">{i.prep} min</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Toggle checked={i.isAvailable} onChange={(v) => toggle(i, v)} label={`${i.name} available`} /><span className="text-[12px] font-semibold">{i.isAvailable ? 'Available' : 'Sold Out'}</span></div></td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <button aria-label={`Edit ${i.name}`} onClick={() => { setErr(''); edit(i); }} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-alt"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${i.name}`} onClick={() => setDel(i)} className="flex h-10 w-10 items-center justify-center rounded-full text-bad hover:bg-bad-bg"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="divide-y divide-line md:hidden">
          {menu.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-3">
              <Img src={i.imageUrl} alt="" label={i.name} sold={!i.isAvailable} className="h-14 w-14 shrink-0" rounded="rounded-[10px]" />
              <button className="min-w-0 flex-1 text-left" onClick={() => { setErr(''); edit(i); }}><p className="truncate font-display text-[14px] font-semibold">{i.name}</p><p className="text-[12px] text-ink-muted tabular-nums">{rm(i.price)} · {i.isAvailable ? 'Available' : 'Sold Out'}</p></button>
              <Toggle checked={i.isAvailable} onChange={(v) => toggle(i, v)} label={`${i.name} available`} />
            </li>
          ))}
        </ul>
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} label={draft?.id ? 'Edit food' : 'Add food'} sheet>
        {draft && (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3.5">
            <h2 className="font-display text-[21px] font-bold">{draft.id ? 'Edit Food' : 'Add New Food'}</h2>
            {err && <InlineAlert tone="error">{err}</InlineAlert>}
            <div className="flex items-center gap-3">
              <Img src={draft.imageUrl} alt="" label="No image" className="h-20 w-20 shrink-0" rounded="rounded-[14px]" />
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-line px-4 text-[14px] font-semibold hover:bg-surface-alt">
                <ImagePlus className="h-4 w-4" />{draft.imageUrl ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!/image\/(png|jpe?g|webp)/.test(f.type)) return setErr('Image must be PNG, JPG or WebP.');
                  try { setDraft({ ...draft, imageUrl: await readImage(f) }); } catch { setErr("That image couldn't be read."); }
                }} />
              </label>
            </div>
            <Field id="fn" label="Food Name"><input id="fn" className="field" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field id="fd" label="Description"><textarea id="fd" rows={2} className="field h-auto py-3" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="fp" label="Price (RM)"><input id="fp" inputMode="decimal" className="field" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0.00" /></Field>
              <Field id="ft" label="Prep time (min)"><input id="ft" inputMode="numeric" className="field" value={draft.prep} onChange={(e) => setDraft({ ...draft, prep: e.target.value })} /></Field>
            </div>
            <Field id="fc" label="Category"><input id="fc" className="field cursor-not-allowed opacity-70" value={stall.cuisine} readOnly /></Field>
            <Field id="fi" label="Ingredients (comma separated)" hint="Shown to students as stall-provided, not allergen-verified."><input id="fi" className="field" value={draft.ingredients} onChange={(e) => setDraft({ ...draft, ingredients: e.target.value })} /></Field>
            <label className="flex min-h-11 items-center justify-between rounded-[12px] bg-surface-alt px-4"><span className="font-medium">Available</span><Toggle checked={draft.isAvailable} onChange={(v) => setDraft({ ...draft, isAvailable: v })} label="Available" /></label>
            <div className="grid grid-cols-2 gap-3 pt-2"><Button type="button" variant="secondary" size="md" onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" size="md" loading={saving}>Save</Button></div>
          </form>
        )}
      </Modal>
      <ConfirmationModal open={!!del} title={`Delete ${del?.name}?`} description="This permanently removes the item from your menu and from students' carts and favourites. Past orders keep their records. This can't be undone." confirmLabel="Delete" tone="danger"
        onCancel={() => setDel(null)} onConfirm={async () => { if (!del) return; const r = await deleteItem(user.id, del.id); toast(r.ok ? 'Item deleted' : r.error, r.ok ? 'info' : 'error'); setDel(null); }} />
    </>
  );
}
