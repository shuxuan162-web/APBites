import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Store, GraduationCap } from 'lucide-react';
import { Button, Field, InlineAlert, Logo } from '../../components/ui';
import { login } from '../../services/api';
import { useSession } from '../../store/session';
import { DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD, DEMO_VENDOR_PASSWORD, vendorEmail } from '../../store/db';
import { isEmail } from '../../lib/format';
import { SEED_STALLS } from '../../data/menu';

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const signIn = useSession((s) => s.signIn);
  const expired = useSession((s) => s.expired);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [vendorStall, setVendorStall] = useState('western');

  const submit = async (e?: React.FormEvent, override?: { email: string; password: string }) => {
    e?.preventDefault();
    if (loading) return;
    const em = override?.email ?? email;
    const pw = override?.password ?? password;
    const errs: typeof errors = {};
    if (!isEmail(em)) errs.email = 'Enter a valid email address.';
    if (!pw) errs.password = 'Password is required.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    const r = await login(em, pw);
    setLoading(false);
    if (!r.ok) return setErrors({ form: r.error });
    signIn(r.data.id, remember);
    const dest = r.data.role === 'vendor' ? '/vendor' : loc.state?.from && !loc.state.from.startsWith('/vendor') ? loc.state.from : '/home';
    nav(dest, { replace: true });
  };

  const demo = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    submit(undefined, { email: em, password: pw });
  };

  return (
    <div className="flex min-h-[100dvh] bg-white">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand p-12 lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/20" />
        <Logo />
        <div className="relative max-w-md">
          <h2 className="font-display text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em]">Skip the queue, grab your food, and enjoy campus life.</h2>
          <p className="mt-4 text-[16px]">Order ahead from 8 APU cafeteria stalls and check live stall workload before you walk over.</p>
        </div>
        <p className="text-[13px] opacity-70">Made for APU Campus Life</p>
      </div>
      <div className="flex flex-1 items-start justify-center px-5 py-8 sm:items-center">
        <div className="w-full max-w-[420px] animate-slideUp">
          <div className="lg:hidden"><Logo size="sm" /></div>
          <h1 className="mt-8 font-display text-[28px] font-bold leading-[1.2] lg:mt-0">Welcome Back!</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Sign in to continue your campus food journey.</p>

          {expired && <div className="mt-5"><InlineAlert tone="warn">Your session expired. Please sign in again.</InlineAlert></div>}
          {errors.form && <div className="mt-5"><InlineAlert tone="error">{errors.form}</InlineAlert></div>}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field id="email" label="APU Email Address" error={errors.email}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                <input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your university email" className="field pl-12" aria-invalid={!!errors.email} />
              </div>
            </Field>
            <Field id="password" label="Password" error={errors.password}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
                <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" className="field pl-12 pr-12" aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:text-ink">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[14px]">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-5 w-5 accent-[#202124]" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-[14px] link-accent">Forgot Password?</Link>
            </div>
            <Button type="submit" full loading={loading} className="!text-[16px]">Sign In</Button>
          </form>

          <p className="mt-6 text-center text-[14px] text-ink-muted">
            New to APBites? <Link to="/signup" className="font-bold text-ink link-accent">Sign Up</Link>
          </p>

          <div className="mt-8 rounded-[18px] border border-dashed border-ink/25 bg-brand-pale p-4">
            <p className="font-display text-[14px] font-bold">Hackathon demo accounts</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">Demo mode — data is stored in this browser, not APU single sign-on. Open the vendor account in a second tab to watch orders update live.</p>
            <div className="mt-3 grid gap-2">
              <Button variant="white" size="md" full icon={<GraduationCap className="h-5 w-5" />} onClick={() => demo(DEMO_STUDENT_EMAIL, DEMO_STUDENT_PASSWORD)} disabled={loading}>
                Continue as demo student
              </Button>
              <div className="flex gap-2">
                <label htmlFor="vstall" className="sr-only">Vendor stall</label>
                <select id="vstall" value={vendorStall} onChange={(e) => setVendorStall(e.target.value)} className="h-11 min-w-0 flex-1 rounded-[12px] border border-line bg-white px-3 text-[14px]">
                  {SEED_STALLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Button variant="dark" size="md" icon={<Store className="h-4 w-4" />} onClick={() => demo(vendorEmail(vendorStall), DEMO_VENDOR_PASSWORD)} disabled={loading}>
                  Vendor
                </Button>
              </div>
              <p className="text-[11px] text-ink-muted">Student: {DEMO_STUDENT_EMAIL} / {DEMO_STUDENT_PASSWORD} · Vendor: [stall].vendor@apbites.demo / {DEMO_VENDOR_PASSWORD}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
