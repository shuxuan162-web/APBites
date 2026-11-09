// Resolves real food / stall photographs for the seed menu at build time.
// Sources: TheMealDB (mdb:) and Wikipedia page images on Wikimedia Commons (wiki:).
// Output: src/data/images.json  { [itemOrStallId]: { url, credit } }
// Run: npm run images            (incremental — keeps existing hits)
//      npm run images -- --force (re-resolve everything)
// Requires Node 22.6+ (imports the TS seed file directly).
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { SEED_ITEMS, SEED_STALLS } from '../src/data/menu.ts';

const UA = 'APBites-hackathon-build/1.0 (image resolver)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const outFile = new URL('../src/data/images.json', import.meta.url);
const force = process.argv.includes('--force');
const out = !force && existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
const used = new Set(Object.values(out).map((v) => v.url));

async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await sleep(300);
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 429 || r.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!r.ok) return null;
      return await r.json();
    } catch {
      await sleep(1000);
    }
  }
  return null;
}

async function lookup(candidate) {
  const [src, ...rest] = candidate.split(':');
  const term = rest.join(':');
  if (src === 'mdb') {
    const j = await getJson(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`);
    const m = j?.meals?.[0];
    if (m?.strMealThumb) return { url: m.strMealThumb, credit: 'TheMealDB' };
  } else if (src === 'wiki') {
    const j = await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/ /g, '_'))}`);
    const t = j?.thumbnail?.source;
    if (t && !/\.svg/i.test(t)) {
      const url = t.split('?')[0].replace(/\/\d+px-/, '/500px-');
      return { url, credit: 'Wikimedia Commons' };
    }
  }
  return null;
}

async function resolve(id, candidates) {
  let first = null;
  for (const c of candidates) {
    const hit = await lookup(c);
    if (!hit) continue;
    if (!first) first = hit;
    if (!used.has(hit.url)) {
      used.add(hit.url);
      return hit;
    }
  }
  if (!first) console.warn(`  ✗ no image for ${id}`);
  return first;
}

for (const s of SEED_STALLS) {
  const key = `stall:${s.id}`;
  if (out[key]) continue;
  const r = await resolve(key, s.q);
  if (r) out[key] = r;
}
for (const it of SEED_ITEMS) {
  if (out[it.id]) continue;
  const r = await resolve(it.id, it.q);
  if (r) out[it.id] = r;
}
writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(`Resolved ${Object.keys(out).length} / ${SEED_ITEMS.length + SEED_STALLS.length} images.`);
