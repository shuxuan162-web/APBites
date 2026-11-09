import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { BackButton, Button, Field, InlineAlert, cx } from '../../components/ui';
import { register } from '../../services/api';
import { toast, useSession } from '../../store/session';
import { isApuEmail } from '../../lib/format';

export default function Signup() {
  const nav = useNavigate();
  const signIn = useSession((s) => s.signIn);
  const [f, setF] = useState({ fullName: '', email: '', studentId: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rules = [
    { ok: f.password.length >= 8, label: 'At least 8 characters' },
    { ok: /[a-z]/i.test(f.password), label: 'At least one letter' },
    { ok: /\d/.test(f.password), label: 'At least one number' },
  ];
  const strength = rules.filter((r) => r.ok).length + (f.password.length >= 12 && /[^a-z0-9]/i.test(f.password) ? 1 : 0);
  const errs = {
    fullName: f.fullName.trim().length < 2 ? 'Enter your full name.' : '',
    email: !isApuEmail(f.email) ? 'Use your APU email (e.g. TP012345@mail.apu.edu.my).' : '',
    password: rules.every((r) => r.ok) ? '' : 'Password does not meet the requirements.',
    confirm: f.confirm !== f.password || !f.confirm ? 'Passwords do not match.' : '',
  };
  const valid = !Object.values(errs).some(Boolean) && agree;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const blur = (k: string) => () => setTouched({ ...touched, [k]: true });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    const r = await register({ fullName: f.fullName, email: f.email, studentId: f.studentId, password: f.password });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    signIn(r.data.id, true);
    toast('Account created — welcome to APBites!');
    nav('/home', { replace: true });
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[460px] bg-white px-5 pb-10">
      <div className="-ml-2 pt-3"><BackButton to="/login" /></div>
      <h1 className="mt-2 font-display text-[28px] font-bold leading-[1.2]">Create Account</h1>
      <p className="mt-1 text-[14px] text-ink-muted">Join APBites and skip the cafeteria queue.</p>
      {error && <div className="mt-5"><InlineAlert tone="error">{error}</InlineAlert></div>}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field id="fullName" label="Full Name" error={touched.fullName ? errs.fullName : ''}>
          <input id="fullName" autoComplete="name" className="field" placeholder="Enter your full name" value={f.fullName} onChange={set('fullName')} onBlur={blur('fullName')} />
        </Field>
        <Field id="email" label="APU Email Address" error={touched.email ? errs.email : ''}>
          <input id="email" type="email" autoComplete="email" className="field" placeholder="TP012345@mail.apu.edu.my" value={f.email} onChange={set('email')} onBlur={blur('email')} />
        </Field>
        <Field id="studentId" label="Student ID (optional)">
          <input id="studentId" className="field" placeholder="e.g. TP012345" value={f.studentId} onChange={set('studentId')} />
        </Field>
        <Field id="password" label="Password" error={touched.password && f.password ? errs.password : ''}>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="new-password" className="field pr-12" placeholder="Create a password" value={f.password} onChange={set('password')} onBlur={blur('password')} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-muted">
              {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        <div aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', i < strength ? (strength <= 1 ? 'bg-bad' : strength <= 2 ? 'bg-warn' : 'bg-ok') : 'bg-line')} />
            ))}
          </div>
          <p className="mt-1 text-[12px] font-medium text-ink-muted">Strength: {['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]}</p>
          <ul className="mt-2 space-y-1">
            {rules.map((r) => (
              <li key={r.label} className={cx('flex items-center gap-1.5 text-[12px]', r.ok ? 'text-[#15803D]' : 'text-ink-muted')}>
                {r.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{r.label}
              </li>
            ))}
          </ul>
        </div>
        <Field id="confirm" label="Confirm Password" error={touched.confirm ? errs.confirm : ''}>
          <input id="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" className="field" placeholder="Re-enter your password" value={f.confirm} onChange={set('confirm')} onBlur={blur('confirm')} />
        </Field>
        <label className="flex cursor-pointer items-start gap-2.5 py-1 text-[13px] text-ink-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#202124]" />
          <span>I agree to the <Link to="/terms" className="link-accent">Terms of Service</Link> and <Link to="/privacy" className="link-accent">Privacy Policy</Link>.</span>
        </label>
        <Button type="submit" full disabled={!valid} loading={loading}>Create Account</Button>
        <p className="text-center text-[12px] text-ink-muted">Demo mode: no verification email is sent. Your account is stored in this browser only.</p>
      </form>
      <p className="mt-6 text-center text-[14px] text-ink-muted">Already have an account? <Link to="/login" className="font-bold text-ink link-accent">Sign In</Link></p>
    </div>
  );
}
