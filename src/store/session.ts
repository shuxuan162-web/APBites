// Per-tab auth session (sessionStorage) so a student tab and a vendor tab can run side by side.
// "Remember me" additionally keeps the session in localStorage.
import { create } from 'zustand';
import { useDb } from './db';
import type { User } from '../lib/types';

const SKEY = 'apbites-session';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const REMEMBER_TTL = 14 * 24 * 60 * 60 * 1000;

interface Session {
  userId: string;
  expiresAt: number;
  remember: boolean;
}

function load(): Session | null {
  try {
    const raw = sessionStorage.getItem(SKEY) ?? localStorage.getItem(SKEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

interface SessionState {
  session: Session | null;
  expired: boolean;
  signIn: (userId: string, remember: boolean) => void;
  signOut: (expired?: boolean) => void;
  checkExpiry: () => boolean;
}

export const useSession = create<SessionState>((set, get) => ({
  session: load(),
  expired: false,
  signIn: (userId, remember) => {
    const s: Session = { userId, remember, expiresAt: Date.now() + (remember ? REMEMBER_TTL : SESSION_TTL) };
    try {
      sessionStorage.setItem(SKEY, JSON.stringify(s));
      if (remember) localStorage.setItem(SKEY, JSON.stringify(s));
      else localStorage.removeItem(SKEY);
    } catch {
      /* storage unavailable — session lives in memory */
    }
    set({ session: s, expired: false });
  },
  signOut: (expired = false) => {
    try {
      sessionStorage.removeItem(SKEY);
      localStorage.removeItem(SKEY);
    } catch {
      /* ignore */
    }
    set({ session: null, expired });
  },
  checkExpiry: () => {
    const s = get().session;
    if (s && s.expiresAt < Date.now()) {
      get().signOut(true);
      return false;
    }
    return !!s;
  },
}));

export function useCurrentUser(): User | null {
  const id = useSession((s) => s.session?.userId);
  return useDb((s) => (id ? s.users.find((u) => u.id === id) ?? null : null));
}

export function currentUserId() {
  return useSession.getState().session?.userId ?? null;
}

// ── onboarding flag ─────────────────────────────────────────
const OKEY = 'apbites-onboarded';
export const hasOnboarded = () => {
  try {
    return localStorage.getItem(OKEY) === '1';
  } catch {
    return false;
  }
};
export const setOnboarded = () => {
  try {
    localStorage.setItem(OKEY, '1');
  } catch {
    /* ignore */
  }
};

// ── toasts ──────────────────────────────────────────────────
export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}
interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}
let tid = 1;
export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = tid++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2800);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
export const toast = (m: string, tone?: Toast['tone']) => useToasts.getState().push(m, tone);

// cart badge bump animation trigger
export const useCartBump = create<{ n: number; bump: () => void }>((set) => ({
  n: 0,
  bump: () => set((s) => ({ n: s.n + 1 })),
}));
