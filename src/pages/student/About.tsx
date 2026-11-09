import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, Compass, Heart, Package, Store, Sparkles } from 'lucide-react';
import { LogoMark, PageHeader } from '../../components/ui';
import { unlockDev } from '../../services/api';
import { useDb } from '../../store/db';
import { toast } from '../../store/session';

const FEATURES = [
  [Compass, 'Digital Food Discovery'], [Package, 'Campus Food Ordering'], [Activity, 'Live Order Tracking'], [Clock, 'Estimated Waiting Times'],
  [Store, 'Stall Workload Visibility'], [Heart, 'Personalized Favourites'], [Sparkles, 'Smart Campus Dining'],
] as const;

export default function About() {
  const taps = useRef(0);
  const nav = useNavigate();
  const dev = useDb((s) => s.devUnlocked);
  return (
    <div className="container-app page-x max-w-2xl">
      <PageHeader title="About APBites" back />
      <section className="rounded-[24px] bg-brand p-6 text-center">
        <div className="mx-auto w-fit"><LogoMark size={72} dark /></div>
        <p className="mt-4 font-display text-[22px] font-extrabold">Making Every Campus Bite Smarter.</p>
      </section>
      <div className="mt-6 space-y-3 text-[15px] leading-[1.7] text-ink-muted">
        <p>APBites is a smart campus cafeteria platform designed to make food discovery and ordering faster, easier, and more convenient for APU students.</p>
        <p>Our mission is to reduce unnecessary waiting, improve cafeteria accessibility, and create a more connected campus dining experience through digital innovation.</p>
      </div>
      <h2 className="h-section mb-3 mt-8">Core Features</h2>
      <ul className="grid grid-cols-2 gap-3">
        {FEATURES.map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-3 rounded-card bg-white p-3.5 shadow-card">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft"><Icon className="h-5 w-5" /></span>
            <span className="font-display text-[13px] font-semibold leading-tight">{label}</span>
          </li>
        ))}
      </ul>
      <section className="mt-8 rounded-card border border-dashed border-ink/25 bg-brand-pale p-5">
        <p className="font-display text-[15px] font-bold">Developed for the Smart Campus & Student Experience Hackathon.</p>
        <p className="mt-1 text-[13px] text-ink-muted">An independent student project — not an official APU service or endorsed by the university. Food photos via TheMealDB and Wikimedia Commons.</p>
      </section>
      <button className="mx-auto mt-6 block h-10 px-4 text-[12px] text-ink-faint" onClick={() => {
        if (dev) return nav('/dev');
        taps.current += 1;
        if (taps.current >= 5) { unlockDev(); toast('Developer demo controls unlocked', 'info'); nav('/dev'); }
      }}>Version 1.0.0 (demo)</button>
    </div>
  );
}
