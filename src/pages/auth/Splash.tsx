import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoMark } from '../../components/ui';
import { hasOnboarded, useCurrentUser } from '../../store/session';

export default function Splash() {
  const nav = useNavigate();
  const user = useCurrentUser();
  useEffect(() => {
    const t = setTimeout(() => {
      if (user) nav(user.role === 'vendor' ? '/vendor' : '/home', { replace: true });
      else nav(hasOnboarded() ? '/login' : '/onboarding', { replace: true });
    }, 1100);
    return () => clearTimeout(t);
  }, [nav, user]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-brand px-6 text-ink">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-white/15" />
      <div className="flex flex-col items-center animate-fadeIn">
        <div className="animate-pop rounded-[26px] bg-white/30 p-2"><LogoMark size={84} dark /></div>
        <h1 className="mt-5 font-display text-[42px] font-extrabold leading-[1.15] tracking-[-1px]">APBites</h1>
        <p className="mt-3 text-center font-display text-[14px] font-medium">Your Campus. Your Cravings. Your Way.</p>
        <div className="mt-8 flex gap-1.5" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-ink/70" style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </div>
      </div>
      <p className="absolute bottom-8 text-[12px] font-medium opacity-70" style={{ marginBottom: 'var(--safe-bottom)' }}>Made for APU Campus Life</p>
    </div>
  );
}
