import { PageHeader } from '../../components/ui';

const CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['What we store', 'In this demo, your name, APU email, optional student ID, profile photo, cart, favourites, orders and notifications are stored only in this browser (localStorage). Nothing is sent to a server.'],
      ['Who can see it', 'Stall vendors see the name and pickup code on orders placed with their stall, plus the items and instructions. They do not see your email or other orders.'],
      ['Passwords', 'Demo passwords are hashed before storage. A production version would hand authentication to a dedicated provider such as Supabase Auth.'],
      ['Your choices', 'Log out to end your session. Clearing your browser data removes all stored demo data.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      ['Prototype', 'APBites is a hackathon prototype running in demo mode. Orders are not sent to real cafeteria stalls and no real payments are processed.'],
      ['Estimates', 'Waiting times and workload levels are estimates based on app orders and are not guarantees.'],
      ['Food information', 'Ingredient information is provided by stalls and not verified for allergens. Always check with the stall if you have dietary requirements.'],
      ['Fair use', 'Please do not place orders you do not intend to collect.'],
    ],
  },
};

export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const c = CONTENT[kind];
  return (
    <div className="container-app page-x max-w-2xl pb-12">
      <PageHeader title={c.title} back />
      <div className="space-y-5">
        {c.body.map(([h, p]) => (
          <section key={h}><h2 className="font-display text-[17px] font-semibold">{h}</h2><p className="mt-1 text-[14px] text-ink-muted">{p}</p></section>
        ))}
      </div>
    </div>
  );
}
