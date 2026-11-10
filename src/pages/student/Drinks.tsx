import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CupSoda } from 'lucide-react';
import { useDb } from '../../store/db';
import { CATEGORY_ORDER, type CategoryId } from '../../data/menu';
import { Button, Chip, EmptyState, OpenBadge, PageHeader, SearchBar, SectionHeader } from '../../components/ui';
import { FoodRow } from '../../components/food';
import { CartIconButton } from '../../components/layout';

/** Match at the start of a word, so "lassi" finds "Mango Lassi" but not "Classic". */
function matchesWordStart(text: string, term: string) {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')}`;
  return hay.includes(` ${term.replace(/[^a-z0-9]+/g, ' ').trim()}`);
}

/** Beverages from every stall, grouped by stall. Drinks behave exactly like food items (same cart rules). */
export default function Drinks() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CategoryId | 'all'>('all');
  const items = useDb((s) => s.items);
  const stalls = useDb((s) => s.stalls);
  const term = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const drinks = Object.values(items).filter((i) => i.kind === 'drink');
    return CATEGORY_ORDER.filter((id) => cat === 'all' || id === cat)
      .map((id) => ({
        stall: stalls[id],
        drinks: drinks
          .filter((d) => d.stallId === id && (!term || matchesWordStart(`${d.name} ${d.description}`, term)))
          .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable) || a.name.localeCompare(b.name)),
      }))
      .filter((g) => g.drinks.length > 0);
  }, [items, stalls, cat, term]);

  const total = groups.reduce((n, g) => n + g.drinks.length, 0);

  return (
    <div className="container-app page-x">
      <PageHeader title="Drinks & Beverages" subtitle="One-of-a-kind sips from every stall." back right={<div className="lg:hidden"><CartIconButton /></div>} />
      <div className="lg:max-w-xl"><SearchBar value={q} onChange={setQ} placeholder="Search drinks…" label="Search drinks" /></div>
      <div className="scroll-x -mx-5 mt-4 px-5 sm:mx-0 sm:px-0" role="group" aria-label="Filter by stall">
        <Chip selected={cat === 'all'} onClick={() => setCat('all')}>All</Chip>
        {CATEGORY_ORDER.map((id) => (
          <Chip key={id} selected={cat === id} onClick={() => setCat(id)}>{stalls[id].name.replace(' Food', '')}</Chip>
        ))}
      </div>
      <p className="mb-2 mt-4 text-[13px] text-ink-muted" aria-live="polite">
        {total} drink{total === 1 ? '' : 's'}{term ? ` matching “${q.trim()}”` : ''} · sample prices, set by each stall
      </p>

      {groups.length ? (
        <div className="space-y-8 pt-2">
          {groups.map(({ stall, drinks }) => (
            <section key={stall.id} aria-label={`${stall.name} drinks`}>
              <SectionHeader
                title={stall.name}
                action={
                  <div className="flex shrink-0 items-center gap-2">
                    <OpenBadge isOpen={stall.isOpen} accepting={stall.acceptingOrders} />
                    <Link to={`/stall/${stall.id}`} className="flex h-9 items-center gap-0.5 whitespace-nowrap text-[13px] font-semibold link-accent">
                      View stall<ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                }
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {drinks.map((d) => <FoodRow key={d.id} item={d} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState art={<CupSoda className="h-14 w-14" strokeWidth={1.6} />} title="No drinks found" description="Try a different name or stall."
          action={<Button full variant="secondary" onClick={() => { setQ(''); setCat('all'); }}>Clear filters</Button>} />
      )}
    </div>
  );
}
