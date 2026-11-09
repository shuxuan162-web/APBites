import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronLeft, Info, Loader2, Minus, Plus, Search, SlidersHorizontal, UtensilsCrossed, X,
} from 'lucide-react';
import { useToasts } from '../store/session';
import type { OrderStatus, WorkloadLevel } from '../lib/types';
import { LEVEL_META } from '../lib/waitTime';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

// ── Logo ────────────────────────────────────────────────────
export function LogoMark({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill={dark ? '#202124' : '#FFDA03'} />
      <path d="M13 31h38a19 19 0 0 1-38 0z" fill={dark ? '#FFDA03' : '#202124'} />
      <path d="M32 11l10 16h-4.6L32 18.6 26.6 27H22z" fill={dark ? '#FFDA03' : '#202124'} />
      <circle cx="44" cy="20" r="3" fill={dark ? '#FFDA03' : '#202124'} />
    </svg>
  );
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'lg' ? 64 : size === 'md' ? 36 : 28;
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={s} />
      <span className={cx('font-display font-extrabold tracking-[-0.04em] text-ink', size === 'lg' ? 'text-[42px]' : size === 'md' ? 'text-[22px]' : 'text-[18px]')}>
        APBites
      </span>
    </span>
  );
}

// ── Buttons ─────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'white';
  size?: 'lg' | 'md' | 'sm';
  loading?: boolean;
  full?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = 'primary', size = 'lg', loading, full, icon, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand text-ink hover:bg-[#F5D000]',
    secondary: 'bg-white text-ink border-[1.5px] border-brand hover:bg-brand-pale',
    ghost: 'bg-transparent text-ink hover:bg-surface-alt',
    danger: 'bg-bad text-white hover:bg-[#C21F1F]',
    dark: 'bg-ink text-white hover:bg-black',
    white: 'bg-white text-ink hover:bg-brand-pale',
  }[variant];
  const s = { lg: 'h-[54px] px-6 text-[15px] rounded-btn', md: 'h-11 px-5 text-[14px] rounded-[12px]', sm: 'h-9 px-3.5 text-[13px] rounded-[10px]' }[size];
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-display font-semibold transition-all duration-150 active:scale-[0.98]',
        s,
        isDisabled ? 'cursor-not-allowed !border-transparent !bg-line !text-ink-faint active:scale-100' : v,
        full && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label, onClick, children, variant = 'plain', badge, className, size = 44,
}: {
  label: string; onClick?: () => void; children: ReactNode; variant?: 'plain' | 'white' | 'brand' | 'soft';
  badge?: number | boolean; className?: string; size?: number;
}) {
  const v = {
    plain: 'bg-transparent hover:bg-surface-alt',
    white: 'bg-white shadow-card hover:shadow-lift',
    brand: 'bg-brand hover:bg-[#F5D000]',
    soft: 'bg-surface-alt hover:bg-line',
  }[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ width: size, height: size }}
      className={cx('relative inline-flex shrink-0 items-center justify-center rounded-full text-ink transition active:scale-95', v, className)}
    >
      {children}
      {badge ? (
        typeof badge === 'number' ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-bold text-white tabular-nums">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : (
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-bad" aria-hidden />
        )
      ) : null}
    </button>
  );
}

export function BackButton({ to, floating = false, label = 'Go back' }: { to?: string; floating?: boolean; label?: string }) {
  const nav = useNavigate();
  return (
    <IconButton
      label={label}
      variant={floating ? 'white' : 'plain'}
      onClick={() => (to ? nav(to) : window.history.length > 1 ? nav(-1) : nav('/home'))}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2} />
    </IconButton>
  );
}

// ── Badges ──────────────────────────────────────────────────
type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'brand' | 'dark';
const TONE: Record<Tone, string> = {
  ok: 'bg-ok-bg text-[#15803D]',
  warn: 'bg-warn-bg text-warn-text',
  bad: 'bg-bad-bg text-bad',
  neutral: 'bg-surface-alt text-ink-muted',
  brand: 'bg-brand-soft text-ink',
  dark: 'bg-ink text-white',
};
const DOT: Record<Tone, string> = { ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', neutral: 'bg-ink-faint', brand: 'bg-brand', dark: 'bg-brand' };

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold leading-none', TONE[tone], className)}>
      {dot && <span className={cx('h-1.5 w-1.5 rounded-full', DOT[tone])} aria-hidden />}
      {children}
    </span>
  );
}

export function LevelBadge({ level, short }: { level: WorkloadLevel; short?: boolean }) {
  const m = LEVEL_META[level];
  return (
    <Badge tone={m.tone} dot>
      {short ? m.short : m.label}
    </Badge>
  );
}

export function OpenBadge({ isOpen, accepting = true }: { isOpen: boolean; accepting?: boolean }) {
  if (!isOpen) return <Badge tone="neutral" dot>Closed</Badge>;
  if (!accepting) return <Badge tone="warn" dot>Paused</Badge>;
  return <Badge tone="ok" dot>Open</Badge>;
}

export const STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending Acceptance', tone: 'brand' },
  accepted: { label: 'Accepted', tone: 'warn' },
  preparing: { label: 'Preparing', tone: 'warn' },
  ready: { label: 'Ready for Pickup', tone: 'ok' },
  collected: { label: 'Collected', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  rejected: { label: 'Rejected', tone: 'bad' },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

export function DemoTag({ children = 'Demo data' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full border border-dashed border-ink/30 bg-white px-2 text-[11px] font-semibold text-ink-muted">
      {children}
    </span>
  );
}

// ── Inputs ──────────────────────────────────────────────────
export function SearchBar({
  value, onChange, placeholder = 'What are you craving today?', onFilter, onClick, autoFocus, onSubmit, filterActive, label = 'Search food',
}: {
  value?: string; onChange?: (v: string) => void; placeholder?: string; onFilter?: () => void; onClick?: () => void;
  autoFocus?: boolean; onSubmit?: () => void; filterActive?: boolean; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className="flex items-center gap-2">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          ref={ref}
          type="search"
          aria-label={label}
          value={value ?? ''}
          readOnly={!!onClick}
          onClick={onClick}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={cx('h-[52px] w-full rounded-btn bg-surface-alt pl-12 pr-10 text-[14px] text-ink placeholder:text-ink-faint focus:bg-white focus:outline-none focus:ring-2 focus:ring-ink/70', onClick && 'cursor-pointer')}
        />
        {value && onChange && (
          <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-line">
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      {onFilter && (
        <button
          type="button"
          aria-label="Filters"
          onClick={onFilter}
          className={cx('relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-btn transition active:scale-95', filterActive ? 'bg-brand' : 'bg-surface-alt hover:bg-line')}
        >
          <SlidersHorizontal className="h-5 w-5" />
          {filterActive && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ink" />}
        </button>
      )}
    </div>
  );
}

export function Chip({ selected, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-display text-[13px] font-semibold transition active:scale-95',
        selected ? 'bg-brand text-ink shadow-sm' : 'border border-line bg-white text-ink-muted hover:border-ink/30 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function QuantitySelector({
  value, onChange, min = 1, max = 20, size = 'md', label = 'Quantity',
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md'; label?: string }) {
  const d = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-surface-alt p-1" role="group" aria-label={label}>
      <button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(value - 1)}
        className={cx(d, 'flex items-center justify-center rounded-full bg-white shadow-sm transition active:scale-90 disabled:opacity-40 disabled:shadow-none')}>
        <Minus className="h-4 w-4" />
      </button>
      <span className={cx('min-w-8 text-center font-display font-bold tabular-nums', size === 'sm' ? 'text-[14px]' : 'text-[16px]')} aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(value + 1)}
        className={cx(d, 'flex items-center justify-center rounded-full bg-brand transition active:scale-90 disabled:bg-line disabled:opacity-60')}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled, tone = 'ok' }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; tone?: 'ok' | 'brand' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? (tone === 'ok' ? 'bg-ok' : 'bg-brand') : 'bg-[#D1D5DB]')}
    >
      <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

export function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-bad" role="alert"><AlertCircle className="h-3.5 w-3.5" />{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// ── Image with graceful fallback (never a broken icon) ──────
export function Img({ src, alt, className, sold, label, rounded = '' }: { src?: string; alt: string; className?: string; sold?: boolean; label?: string; rounded?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'err'>(src ? 'loading' : 'err');
  const imgRef = useRef<HTMLImageElement>(null);
  // Re-sync when src changes. A cached image may already be complete before onLoad is attached.
  useEffect(() => {
    const el = imgRef.current;
    if (!src) setState('err');
    else if (el?.complete) setState(el.naturalWidth > 0 ? 'ok' : 'err');
    else setState('loading');
  }, [src]);
  return (
    <div className={cx(/\b(absolute|fixed)\b/.test(className ?? '') ? '' : 'relative', 'overflow-hidden bg-brand-pale', rounded, className)}>
      {state !== 'err' && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('err')}
          className={cx('h-full w-full object-cover transition-opacity duration-300', state === 'ok' ? 'opacity-100' : 'opacity-0', sold && 'img-sold')}
        />
      )}
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-pale to-brand-soft" />}
      {state === 'err' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-soft via-brand-pale to-white p-2 text-center" role="img" aria-label={alt}>
          <UtensilsCrossed className="h-1/4 max-h-10 min-h-5 w-auto text-ink/70" strokeWidth={1.8} />
          {label && <span className="line-clamp-2 font-display text-[11px] font-semibold leading-tight text-ink/70">{label}</span>}
        </div>
      )}
    </div>
  );
}

// ── Feedback ────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-card bg-surface-alt', className)} aria-hidden />;
}

export function EmptyState({ art, title, description, action }: { art: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center animate-slideUp">
      <div className="mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-brand-soft">{art}</div>
      <h2 className="font-display text-[21px] font-bold">{title}</h2>
      <p className="mt-1.5 max-w-xs text-[14px] text-ink-muted">{description}</p>
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function InlineAlert({ tone = 'info', children, action }: { tone?: 'info' | 'error' | 'warn' | 'ok'; children: ReactNode; action?: ReactNode }) {
  const t = { info: 'bg-brand-pale border-brand/60', error: 'bg-bad-bg border-bad/30 text-[#991B1B]', warn: 'bg-warn-bg border-warn/40 text-warn-text', ok: 'bg-ok-bg border-ok/30 text-[#166534]' }[tone];
  const Icon = tone === 'error' || tone === 'warn' ? AlertCircle : tone === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={cx('flex items-start gap-2.5 rounded-[14px] border p-3.5 text-[13px] leading-[1.5]', t)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" style={{ paddingTop: 'var(--safe-top)' }} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-btn bg-ink py-3 pl-4 pr-2 text-[14px] font-medium text-white shadow-float animate-slideUp">
          {t.tone === 'error' ? <AlertCircle className="h-5 w-5 text-[#FCA5A5]" /> : t.tone === 'info' ? <Info className="h-5 w-5 text-brand" /> : <CheckCircle2 className="h-5 w-5 text-brand" />}
          <span className="flex-1">{t.message}</span>
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded-full p-1.5 text-white/70 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ── Modals ──────────────────────────────────────────────────
export function Modal({ open, onClose, children, label, sheet = false }: { open: boolean; onClose: () => void; children: ReactNode; label: string; sheet?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus(), 30);
    const o = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = o;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={cx('fixed inset-0 z-[90] flex bg-black/40 animate-[fadeIn_160ms_ease-out_both]', sheet ? 'items-end justify-center sm:items-center' : 'items-center justify-center p-5')} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          'max-h-[90vh] w-full overflow-y-auto bg-white shadow-float',
          sheet ? 'max-w-lg rounded-t-modal p-6 pb-[calc(24px+var(--safe-bottom))] animate-sheet sm:rounded-modal' : 'max-w-sm rounded-modal p-6 animate-pop',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmationModal({
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, tone = 'primary', loading, children,
}: {
  open: boolean; title: string; description: ReactNode; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void;
  onCancel: () => void; tone?: 'primary' | 'danger'; loading?: boolean; children?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onCancel} label={title}>
      <h2 className="font-display text-[21px] font-bold">{title}</h2>
      <div className="mt-2 text-[14px] text-ink-muted">{description}</div>
      {children}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" size="md" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} size="md" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

// ── Layout helpers ──────────────────────────────────────────
export function PageHeader({ title, subtitle, back, right, backTo }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode; backTo?: string }) {
  return (
    <header className="flex items-start gap-2 pb-5 pt-4">
      {back && <div className="-ml-2"><BackButton to={backTo} /></div>}
      <div className={cx('min-w-0 flex-1', back && 'pt-1')}>
        <h1 className="h-page">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[14px] text-ink-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionHeader({ title, action, sub }: { title: string; action?: ReactNode; sub?: string }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[20px] font-bold leading-[1.3]">{title}</h2>
        {sub && <p className="text-[13px] text-ink-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, onChange, label }: { value: number; onChange?: (v: number) => void; label: string }) {
  return (
    <div className="flex gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} role={onChange ? 'radio' : undefined} aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange?.(n)} className="p-1 text-[24px] leading-none transition active:scale-90">
          <span className={n <= value ? 'text-brand drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]' : 'text-line'}>★</span>
        </button>
      ))}
    </div>
  );
}
