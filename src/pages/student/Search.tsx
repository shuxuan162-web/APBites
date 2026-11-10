import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, History, X } from 'lucide-react';
import { useDb } from '../../store/db';
import { useCurrentUser } from '../../store/session';
import { useStallLive } from '../../lib/hooks';
import { CATEGORY_ORDER, type CategoryId } from '../../data/menu';
import { addRecentSearch, clearRecentSearches } from '../../services/api';
import { BackButton, Button, Chip, EmptyState, InlineAlert, Modal, SearchBar, cx } from '../../components/ui';
import { FoodRow } from '../../components/food';
import type { WorkloadLevel } from '../../lib/types';

type Sort = 'relevance' | 'price_asc' | 'price_desc' | 'wait' | 'name';
const SORTS: { k: Sort; label: string }[] = [
  { k: 'relevance', label: 'Relevance' },
  { k: 'price_asc', label: 'Price: Low to High' },
  { k: 'price_desc', label: 'Price: High to Low' },
  { k: 'wait', label: 'Shortest Estimated Wait' },
  { k: 'name', label: 'Food Name A–Z' },
];
const BUDGETS = [5, 10, 15, 20];
const TIMES = [10, 15, 20, 30];

function EmptyPlate() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r="30" fill="#fff" stroke="#202124" strokeWidth="2.5" />
      <circle cx="36" cy="36" r="19" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
      <path d="M8 10v14M4 10v10a4 4 0 0 0 8 0V10M64 10c-4 2-5 8-5 14h5v16" stroke="#202124" strokeWidth="2.5" fill="none" strokeLinecap="round" transform="translate(0 4) scale(.95)" />
    </svg>
  );
}

export default function Search() {
  const [params] = useSearchParams();
  const user = useCurrentUser()!;
  const items = useDb((s) => s.items);
  const recent = useDb((s) => s.recentSearches[user.id] ?? []);
  const live = useStallLive();
  const maxMenuPrice = useMemo(() => Math.ceil(Math.max(25, ...Object.values(items).map((i) => i.price))), [items]);

  const [q, setQ] = useState('');
  const [cuisines, setCuisines] = useState<CategoryId[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(Number(params.get('max')) || maxMenuPrice);
  const [type, setType] = useState<'all' | 'food' | 'drink'>(params.get('type') === 'drink' ? 'drink' : 'all');
  const [availableOnly, setAvailableOnly] = useState(!!params.get('time') || !!params.get('max'));
  const [levels, setLevels] = useState<WorkloadLevel[]>([]);
  const [maxWait, setMaxWait] = useState<number | null>(Number(params.get('time')) || null);
  const [sort, setSort] = useState<Sort>(params.get('time') ? 'wait' : params.get('max') ? 'price_asc' : 'relevance');
  const [sheet, setSheet] = useState(params.get('filters') === '1');

  useEffect(() => {
    const t = setTimeout(() => q.trim() && addRecentSearch(user.id, q), 1200);
    return () => clearTimeout(t);
  }, [q, user.id]);

  const term = q.trim().toLowerCase();
  const itemWait = (id: string) => {
    const it = items[id];
    const l = live[it.stallId];
    return l.wait == null ? null : Math.max(1, Math.round(l.wait - l.typical + it.prep));
  };

  const results = useMemo(() => {
    const list = Object.values(items)
      .map((i) => {
        const stall = live[i.stallId].stall;
        let score = 0;
        if (term) {
          const n = i.name.toLowerCase();
          if (n.startsWith(term)) score += 10;
          else if (n.includes(term)) score += 6;
          if (stall.name.toLowerCase().includes(term) || stall.cuisine.toLowerCase().includes(term)) score += 4;
          if (i.description.toLowerCase().includes(term)) score += 2;
          if (i.ingredients?.some((g) => g.toLowerCase().includes(term))) score += 2;
          if (!score) return null;
        }
        return { i, score, wait: itemWait(i.id) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .filter(({ i, wait }) => {
        if (type !== 'all' && i.kind !== type) return false;
        if (cuisines.length && !cuisines.includes(i.stallId)) return false;
        if (i.price > maxPrice) return false;
        if (availableOnly && (!i.isAvailable || !live[i.stallId].stall.isOpen)) return false;
        if (levels.length && !levels.includes(live[i.stallId].load.level)) return false;
        if (maxWait != null && (wait == null || wait > maxWait)) return false;
        return true;
      });
    const by: Record<Sort, (a: (typeof list)[0], b: (typeof list)[0]) => number> = {
      relevance: (a, b) => b.score - a.score || Number(b.i.isAvailable) - Number(a.i.isAvailable),
      price_asc: (a, b) => a.i.price - b.i.price,
      price_desc: (a, b) => b.i.price - a.i.price,
      wait: (a, b) => (a.wait ?? 999) - (b.wait ?? 999),
      name: (a, b) => a.i.name.localeCompare(b.i.name),
    };
    return list.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, live, term, type, cuisines, maxPrice, availableOnly, levels, maxWait, sort]);

  const filterCount = (type !== 'all' ? 1 : 0) + cuisines.length + levels.length + (maxPrice < maxMenuPrice ? 1 : 0) + (availableOnly ? 1 : 0) + (maxWait ? 1 : 0);
  const clear = () => {
    setType('all'); setCuisines([]); setLevels([]); setMaxPrice(maxMenuPrice); setAvailableOnly(false); setMaxWait(null); setSort('relevance'); setQ('');
  };
  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const showBrowse = !term && !filterCount;

  return (
    <div className="container-app page-x">
      <header className="flex items-center gap-2 pb-4 pt-4">
        <div className="-ml-2"><BackButton /></div>
        <h1 className="h-page">Search Food</h1>
      </header>
      <SearchBar value={q} onChange={setQ} autoFocus onFilter={() => setSheet(true)} filterActive={filterCount > 0} onSubmit={() => addRecentSearch(user.id, q)} />

      {/* quick finders */}
      <div className="mt-4 space-y-3">
        <div className="scroll-x" role="group" aria-label="Budget">
          <span className="flex shrink-0 items-center pr-1 text-[12px] font-semibold text-ink-muted">Budget</span>
          {BUDGETS.map((b) => <Chip key={b} selected={maxPrice === b} onClick={() => { setMaxPrice(maxPrice === b ? maxMenuPrice : b); setAvailableOnly(true); }}>Under RM {b}</Chip>)}
        </div>
        <div className="scroll-x" role="group" aria-label="Time available">
          <span className="flex shrink-0 items-center pr-1 text-[12px] font-semibold text-ink-muted"><Clock className="mr-1 h-3.5 w-3.5" />Time</span>
          {TIMES.map((t) => <Chip key={t} selected={maxWait === t} onClick={() => { setMaxWait(maxWait === t ? null : t); setAvailableOnly(true); if (maxWait !== t) setSort('wait'); }}>{t} min</Chip>)}
        </div>
      </div>
      {maxWait && <div className="mt-3"><InlineAlert>Showing meals estimated to be ready within {maxWait} minutes, based on current app orders. Estimates are not guarantees.</InlineAlert></div>}

      {showBrowse && recent.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between"><h2 className="font-display text-[16px] font-semibold">Recent searches</h2><button className="text-[13px] link-accent" onClick={() => clearRecentSearches(user.id)}>Clear</button></div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-alt px-3.5 text-[13px] font-medium hover:bg-line"><History className="h-3.5 w-3.5 text-ink-muted" />{r}</button>)}
          </div>
        </section>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted" aria-live="polite"><b className="text-ink">{results.length}</b> result{results.length === 1 ? '' : 's'}</p>
        <label className="flex items-center gap-2 text-[13px]">
          <span className="text-ink-muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-[10px] border border-line bg-white px-2 text-[13px] font-medium">
            {SORTS.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {results.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.slice(0, 80).map(({ i }) => <FoodRow key={i.id} item={i} showStall highlight={q} />)}
        </div>
      ) : (
        <EmptyState art={<EmptyPlate />} title="No bites found!" description="Try searching for something else." action={<Button full variant="secondary" onClick={clear}>Clear Filters</Button>} />
      )}

      <Modal open={sheet} onClose={() => setSheet(false)} label="Filters" sheet>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[21px] font-bold">Filters</h2>
          <button aria-label="Close filters" onClick={() => setSheet(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-alt"><X className="h-5 w-5" /></button>
        </div>
        <h3 className="mt-4 font-display text-[15px] font-semibold">Type</h3>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Item type">
          {(['all', 'food', 'drink'] as const).map((k) => <Chip key={k} selected={type === k} onClick={() => setType(k)}>{k === 'all' ? 'All' : k === 'food' ? 'Food' : 'Drinks'}</Chip>)}
        </div>
        <h3 className="mt-5 font-display text-[15px] font-semibold">Cuisine</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((id) => <Chip key={id} selected={cuisines.includes(id)} onClick={() => toggle(cuisines, id, setCuisines)}>{live[id].stall.name.replace(' Food', '')}</Chip>)}
        </div>
        <h3 className="mt-5 flex justify-between font-display text-[15px] font-semibold"><span>Max price</span><span className="tabular-nums">RM 0 – RM {maxPrice}</span></h3>
        <input type="range" min={3} max={maxMenuPrice} step={1} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-3 w-full accent-[#202124]" aria-label="Maximum price" />
        <h3 className="mt-5 font-display text-[15px] font-semibold">Stall workload</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['low', 'moderate', 'high'] as WorkloadLevel[]).map((l) => <Chip key={l} selected={levels.includes(l)} onClick={() => toggle(levels, l, setLevels)}>{l[0].toUpperCase() + l.slice(1)}</Chip>)}
        </div>
        <h3 className="mt-5 font-display text-[15px] font-semibold">Estimated wait</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIMES.map((t) => <Chip key={t} selected={maxWait === t} onClick={() => setMaxWait(maxWait === t ? null : t)}>≤ {t} min</Chip>)}
        </div>
        <label className={cx('mt-5 flex min-h-11 cursor-pointer items-center justify-between rounded-[12px] bg-surface-alt px-4')}>
          <span className="font-display text-[15px] font-semibold">Available now only</span>
          <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="h-5 w-5 accent-[#202124]" />
        </label>
        <p className="mt-3 text-[12px] text-ink-muted">Vegetarian and spiciness filters will appear once stalls verify that information.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="md" onClick={clear}>Reset</Button>
          <Button size="md" onClick={() => setSheet(false)}>Show {results.length} results</Button>
        </div>
      </Modal>
    </div>
  );
}
