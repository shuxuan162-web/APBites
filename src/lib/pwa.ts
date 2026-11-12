// Installable web app support: service worker registration + install prompt state.
import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

interface PwaState {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  /** iOS Safari has no install prompt; users add it from the Share menu. */
  iosManual: boolean;
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const usePwa = create<PwaState>((set, get) => ({
  deferred: null,
  installed: isStandalone(),
  iosManual: isIos() && !isStandalone(),
  install: async () => {
    const e = get().deferred;
    if (!e) return 'unavailable';
    await e.prompt();
    const { outcome } = await e.userChoice;
    set({ deferred: null, installed: outcome === 'accepted' });
    return outcome;
  },
}));

export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own "Install app" button instead of the mini-infobar
    usePwa.setState({ deferred: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ deferred: null, installed: true }));
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* the app works fine without offline support */
      });
    });
  }
}
