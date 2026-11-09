import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Trash2 } from 'lucide-react';
import { useCurrentUser, toast } from '../../store/session';
import { updateProfile } from '../../services/api';
import { Button, Field, InlineAlert, PageHeader } from '../../components/ui';
import { Avatar } from '../../components/layout';

/** Downscale an uploaded image to a small JPEG data URL so it fits in demo storage. */
function toAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 160;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d')!;
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      resolve(c.toDataURL('image/jpeg', 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function EditProfile() {
  const user = useCurrentUser()!;
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.fullName);
  const [sid, setSid] = useState(user.studentId ?? '');
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="container-app page-x max-w-xl">
      <PageHeader title="Edit Profile" back />
      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar name={name || user.fullName} url={avatar} size={104} />
          <button onClick={() => fileRef.current?.click()} aria-label="Change profile picture" className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white shadow-float"><Camera className="h-5 w-5" /></button>
        </div>
        {avatar && <button onClick={() => setAvatar(undefined)} className="mt-2 flex h-9 items-center gap-1 text-[13px] text-ink-muted hover:text-bad"><Trash2 className="h-3.5 w-3.5" />Remove photo</button>}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (!/image\/(png|jpe?g|webp)/.test(f.type)) return setError('Please choose a PNG, JPG or WebP image.');
          try { setAvatar(await toAvatar(f)); setError(''); } catch { setError("We couldn't read that image. Try another one."); }
        }} />
      </div>
      {error && <div className="mt-4"><InlineAlert tone="error">{error}</InlineAlert></div>}
      <form className="mt-6 space-y-4" onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const r = await updateProfile(user.id, { fullName: name, studentId: sid, avatarUrl: avatar });
        setLoading(false);
        if (!r.ok) return setError(r.error);
        toast('Profile updated');
        nav('/profile');
      }}>
        <Field id="name" label="Full Name"><input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field id="email" label="Email Address" hint="Your email is your sign-in identity. Changing it needs a verified email flow, which isn't available in demo mode.">
          <input id="email" className="field cursor-not-allowed opacity-70" value={user.email} readOnly aria-readonly />
        </Field>
        <Field id="sid" label="Student ID"><input id="sid" className="field" value={sid} onChange={(e) => setSid(e.target.value)} placeholder="e.g. TP012345" /></Field>
        <Button type="submit" full loading={loading} disabled={!name.trim()}>Save Changes</Button>
      </form>
    </div>
  );
}
