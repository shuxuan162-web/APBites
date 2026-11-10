// Build-time guard: fails `npm run build` if any drink name appears at more than one stall.
// (menu.ts calls assertUniqueDrinks on import; importing it is the check.)
import { SEED_ITEMS, SEED_DRINKS, assertUniqueDrinks } from '../src/data/menu.ts';

assertUniqueDrinks(SEED_ITEMS);
const perStall = {};
for (const d of SEED_DRINKS) perStall[d.stallId] = (perStall[d.stallId] ?? 0) + 1;
const food = SEED_ITEMS.filter((i) => i.kind === 'food').length;
if (food !== 80) throw new Error(`Expected 80 food items, found ${food}.`);
console.log(`✓ ${SEED_DRINKS.length} drinks, all unique across ${Object.keys(perStall).length} stalls; ${food} food items.`);
