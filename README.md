# APBites

**Your Campus. Your Cravings. Your Way.** A smart campus food ordering and live stall status app for APU, built for the *Smart Campus & Student Experience* hackathon.

React 18, TypeScript, Vite, Tailwind CSS, React Router, Zustand, Lucide and Recharts.

## Try it live

**👉 [apbites.shuzers.my](https://apbites.shuzers.my/)**

- Open it on a phone or computer. The layout adapts: bottom tabs on phones, top navigation on desktop, and a sidebar for vendors.
- **Install it as an app.** On Android or desktop Chrome/Edge, use the browser's *Install* option or the *Install the APBites app* card on the Profile page. On iPhone, tap *Share → Add to Home Screen*. The installed app opens full-screen and works offline for pages you've already visited.
- Sign in with the one-tap demo accounts on the login screen (see [Demo mode](#demo-mode-no-backend-needed)). To watch orders update live, open the student account in one tab and a vendor account in another.
- Hosted on Vercel and deployed automatically from `main`.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

## Demo mode (no backend needed)

No backend is configured, so APBites runs in a clearly labelled **demo mode**. All data lives in the browser's `localStorage` and syncs live between tabs. This lets a student tab and a vendor tab talk to each other in real time.

| Account | Email | Password |
|---|---|---|
| Student | `student@mail.apu.edu.my` | `apbites123` |
| Vendor (one per stall) | `western.vendor@apbites.demo`, `korean.vendor@…` | `vendor123` |

The login screen has one-tap buttons for both accounts.

**Demo controls** (developer only, hidden from students): open them from Vendor → Settings → *Open demo controls*, or tap the version label five times on About. From there you can generate simulated orders, turn on auto-traffic, or reset all data. Simulated orders are always flagged and shown as "demo data".


## What's inside

- **Student:** splash, onboarding, sign in/up (validation, strength meter), home (greeting, active order banner, live snapshot, featured, reorder, rule-based recommendations, budget and quick-meal finders), explore with filters, stall menu, food detail (instructions, quantity), search (filters, sort, highlight, recent), cart (one stall per order, replace-cart confirmation), checkout (ASAP or scheduled slots within hours, pay at counter or *simulated* online payment), confirmation, live tracking timeline, live cafeteria status, orders (active/completed/cancelled), receipts, favourites, notifications, profile, edit profile (photo), help (FAQ and stored support form), about, privacy/terms.
- **Vendor:** dashboard KPIs, incoming orders with a state machine (accept, reject with reason, preparing, ready, collect with code verification), menu CRUD with availability toggles and image upload, live status controls (open/paused, prep stations, thresholds, manual workload report), 7-day analytics charts, settings.
- **Beverages:** a **Drinks & Beverages** page (`/drinks`, reached from Home's *Thirsty? Grab a Drink* section, each stall's *Drinks* section, or the *Drinks* type filter in Search). It lists 24 drinks, 3 per stall, and no drink is sold at two stalls. This is enforced at build time (`scripts/check-drinks.mjs`) and in `api.ts` when vendors add or rename a drink. Drink prices are sample prices that vendors can edit.
- **Data:** 8 stalls and the 80 menu items with names, descriptions and prices exactly as briefed. Photos are resolved from TheMealDB and Wikimedia Commons (`npm run images`). A graceful placeholder appears if an image fails to load.

## Wait-time and workload model

`src/lib/waitTime.ts`

```
estimated wait = (queued prep minutes + remaining minutes of orders cooking) / parallel prep stations
                 + this order's prep minutes
```

- An order's prep time is its longest dish plus 35% of the rest.
- Workload is **Low**, **Moderate** or **High** based on active app orders against **per-stall configurable thresholds**.
- A vendor's manual report overrides the estimate for 30 minutes and is labelled *Vendor-reported*.
- The UI always says this measures **digital order workload, not physical crowd density**. `StatusRecord.source` is ready for `sensor` data, such as a future ESP32/MQTT people counter.

## Connecting a real backend later

Every write goes through `src/services/api.ts`, which already enforces what a server should:

- role checks and vendor ↔ stall ownership
- server-side price recalculation, which rejects stale totals
- valid status transitions
- optimistic concurrency (`order.version`)
- duplicate-submit locks
- price snapshots on order items

To move to a real backend, swap the function bodies for Supabase queries and RPCs, map the `useDb` reads to Supabase Realtime subscriptions, and mirror the rules as RLS policies. The UI does not change. The types in `src/lib/types.ts` map 1:1 to the tables in the brief (users, stalls, menu_items, orders, order_items, favourites, notifications, stall_status_history).

*An independent student hackathon project. Not an official APU service.*
