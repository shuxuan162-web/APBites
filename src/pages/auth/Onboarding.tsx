import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Bell, CheckCircle2, Clock, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';
import { Button, cx } from '../../components/ui';
import { setOnboarded } from '../../store/session';
import { useDb } from '../../store/db';

function Blob({ className }: { className: string }) {
  return <div className={cx('absolute rounded-full', className)} aria-hidden />;
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 h-[230px] w-[130px] rounded-[26px] border-[5px] border-ink bg-white p-2 shadow-float">
      <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/80" />
      {children}
    </div>
  );
}

function ArtDiscover() {
  const imgs = useDb((s) => ['wes-03', 'kor-01', 'mam-01', 'jap-04'].map((id) => s.items[id]?.imageUrl));
  return (
    <div className="relative flex h-full items-center justify-center">
      <Blob className="h-64 w-64 bg-brand-soft" />
      <Blob className="-right-2 top-6 h-16 w-16 bg-brand" />
      <Blob className="bottom-8 left-6 h-10 w-10 bg-brand/60" />
      <Phone>
        <div className="grid grid-cols-2 gap-1.5">
          {imgs.map((src, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-[8px] bg-brand-soft">{src && <img src={src} alt="" className="h-full w-full object-cover" />}</div>
          ))}
        </div>
        <div className="mt-2 h-2 w-3/4 rounded bg-line" />
        <div className="mt-1 h-2 w-1/2 rounded bg-line" />
        <div className="mt-2 h-6 rounded-[8px] bg-brand" />
      </Phone>
      <div className="absolute left-[12%] top-[22%] z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lift"><UtensilsCrossed className="h-6 w-6" /></div>
    </div>
  );
}

function ArtQueue() {
  return (
    <div className="relative flex h-full items-center justify-center">
      <Blob className="h-64 w-64 bg-brand-soft" />
      <div className="absolute left-[8%] top-1/2 z-0 flex -translate-y-1/2 flex-col gap-2 opacity-60">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5"><Users className="h-5 w-5 text-ink-muted" /><div className="h-1.5 w-8 rounded bg-ink-faint" /></div>
        ))}
      </div>
      <Phone>
        <div className="flex h-[150px] flex-col items-center justify-center gap-2">
          <ShoppingBag className="h-10 w-10" />
          <div className="rounded-full bg-ok-bg px-2 py-0.5 text-[10px] font-bold text-[#15803D]">Order placed</div>
          <div className="h-2 w-16 rounded bg-line" />
        </div>
        <div className="h-6 rounded-[8px] bg-brand" />
      </Phone>
      <div className="absolute right-[12%] top-[18%] z-20 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-lift"><Clock className="h-4 w-4" /><span className="font-display text-[12px] font-bold">Skip the queue</span></div>
    </div>
  );
}

function ArtLive() {
  const rows = [
    ['Low', 'bg-ok', 'w-1/3'],
    ['Moderate', 'bg-warn', 'w-2/3'],
    ['High', 'bg-bad', 'w-full'],
  ];
  return (
    <div className="relative flex h-full items-center justify-center">
      <Blob className="h-64 w-64 bg-brand-soft" />
      <Phone>
        <div className="mb-2 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /><span className="font-display text-[10px] font-bold">Live Status</span></div>
        <div className="space-y-2">
          {rows.map(([l, c, w]) => (
            <div key={l} className="rounded-[8px] bg-surface-alt p-1.5">
              <div className="mb-1 flex justify-between text-[9px] font-semibold"><span>{l}</span><span>min</span></div>
              <div className="h-1.5 rounded-full bg-white"><div className={cx('h-1.5 rounded-full', c, w)} /></div>
            </div>
          ))}
        </div>
        <div className="mt-2 h-6 rounded-[8px] bg-brand" />
      </Phone>
      <div className="absolute right-[10%] top-[20%] z-20 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lift"><Bell className="h-6 w-6" /></div>
      <div className="absolute bottom-[18%] left-[12%] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-ok text-white shadow-lift"><CheckCircle2 className="h-6 w-6" /></div>
    </div>
  );
}

const SLIDES = [
  { art: <ArtDiscover />, title: 'Craving Something Good?', text: 'Explore delicious meals from your favourite APU cafeteria stalls, all in one place.' },
  { art: <ArtQueue />, title: 'Order Ahead, Save Time.', text: "Place your order before your break and collect your meal when it's ready." },
  { art: <ArtLive />, title: 'Smarter Dining Starts Here.', text: 'Check stall crowd levels and estimated preparation times before choosing where to eat.' },
];

export default function Onboarding() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const touch = useRef<number | null>(null);
  const finish = () => {
    setOnboarded();
    nav('/login', { replace: true });
  };
  const next = () => (i < 2 ? setI(i + 1) : finish());
  const s = SLIDES[i];

  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-white px-5 pb-8"
      style={{ paddingBottom: 'calc(32px + var(--safe-bottom))' }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (dx < -50 && i < 2) setI(i + 1);
        if (dx > 50 && i > 0) setI(i - 1);
        touch.current = null;
      }}
    >
      <div className="flex h-14 items-center justify-end">
        {i < 2 && <button onClick={finish} className="h-11 px-3 font-display text-[14px] font-semibold text-ink-muted hover:text-ink">Skip</button>}
      </div>
      <div key={i} className="h-[42vh] min-h-[260px] animate-slideUp">{s.art}</div>
      <div key={`t${i}`} className="animate-slideUp text-center">
        <h1 className="mt-7 font-display text-[28px] font-bold leading-[1.2]">{s.title}</h1>
        <p className="mx-auto mt-3 max-w-[320px] text-[15px] leading-[1.6] text-ink-muted">{s.text}</p>
      </div>
      <div className="mt-auto pt-8">
        <div className="mb-6 flex justify-center gap-2" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((_, k) => (
            <button key={k} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)}
              className={cx('h-2 rounded-full transition-all duration-300', k === i ? 'w-6 bg-brand' : 'w-2 bg-line')} />
          ))}
        </div>
        <Button full onClick={next}>{i < 2 ? 'Next' : 'Get Started'}</Button>
      </div>
    </div>
  );
}
