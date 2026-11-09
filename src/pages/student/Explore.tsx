import { useState } from 'react';
import { SearchX } from 'lucide-react';
import { useDb } from '../../store/db';
import { useFirstLoad, useStallLive } from '../../lib/hooks';
import { CATEGORY_ORDER, type CategoryId } from '../../data/menu';
import { Button, Chip, EmptyState, PageHeader, SearchBar, Skeleton } from '../../components/ui';
import { StallCard } from '../../components/food';
import { CartIconButton } from '../../components/layout';

export default function Explore() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const live = useStallLive();
  const items = useDb((s) => s.items);
  const loading = useFirstLoad('explore');
  const term = q.trim().toLowerCase();

  const list = live.list.filter(({ stall }) => {
    if (cat !== 'all' && stall.id !== cat) return false;
    if (!term) return true;
    const hay = [stall.name, stall.cuisine, stall.tagline, stall.description].join(' ').toLowerCase();
    if (hay.includes(term)) return true;
    return Object.values(items).some((i) => i.stallId === stall.id && (i.name + ' ' + i.description).toLowerCase().includes(term));
  });

  return (
    <div className="container-app page-x">
      <PageHeader title="Explore Food" subtitle="Discover something delicious on campus." right={<div className="lg:hidden"><CartIconButton /></div>} />
      <div className="lg:max-w-xl"><SearchBar value={q} onChange={setQ} placeholder="Search food or stalls…" label="Search food or stalls" /></div>
      <div className="scroll-x -mx-5 mt-4 px-5 sm:mx-0 sm:px-0" role="group" aria-label="Filter by cuisine">
        <Chip selected={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
        {CATEGORY_ORDER.map((id) => (
          <Chip key={id} selected={cat === id} onClick={() => setCat(id)}>{live[id].stall.cuisine === 'Middle Eastern' ? 'Shawarma' : live[id].stall.cuisine}</Chip>
        ))}
      </div>
      <p className="mb-3 mt-4 text-[13px] text-ink-muted" aria-live="polite">{list.length} stall{list.length === 1 ? '' : 's'}{term ? ` matching “${q.trim()}”` : ''}</p>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[260px] rounded-stall" />)}</div>
      ) : list.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((l) => <StallCard key={l.stall.id} live={l} />)}
        </div>
      ) : (
        <EmptyState art={<SearchX className="h-14 w-14" strokeWidth={1.6} />} title="No stalls found" description="Try a different search or cuisine."
          action={<Button full variant="secondary" onClick={() => { setQ(''); setCat('all'); }}>Clear Filters</Button>} />
      )}
    </div>
  );
}
