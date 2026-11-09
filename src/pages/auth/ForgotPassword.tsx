import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { BackButton, Button, Field, InlineAlert } from '../../components/ui';
import { requestPasswordReset } from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; msg: string } | null>(null);
  return (
    <div className="mx-auto min-h-[100dvh] max-w-[460px] px-5">
      <div className="-ml-2 pt-3"><BackButton to="/login" /></div>
      <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft"><KeyRound className="h-8 w-8" /></div>
      <h1 className="mt-5 font-display text-[28px] font-bold">Forgot Password?</h1>
      <p className="mt-1 text-[14px] text-ink-muted">Enter your APU email and we'll help you get back in.</p>
      <form className="mt-6 space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const r = await requestPasswordReset(email);
        setLoading(false);
        setRes(r.ok ? { ok: true, msg: r.data } : { ok: false, msg: r.error });
      }}>
        <Field id="email" label="APU Email Address">
          <input id="email" type="email" className="field" placeholder="Enter your university email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {res && <InlineAlert tone={res.ok ? 'info' : 'error'}>{res.msg}</InlineAlert>}
        <Button type="submit" full loading={loading}>Send Reset Link</Button>
      </form>
      <p className="mt-6 text-center text-[14px]"><Link to="/login" className="link-accent">Back to Sign In</Link></p>
    </div>
  );
}
