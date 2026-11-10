// APBites seed data — 8 stalls, 80 menu items.
// Names, descriptions and prices are taken verbatim from the APBites brief.
// `q` holds image-lookup candidates used only by scripts/resolve-images.mjs.

export type CategoryId =
  | 'western'
  | 'korean'
  | 'chinese'
  | 'japanese'
  | 'shawarma'
  | 'mamak'
  | 'kopitiam'
  | 'indian';

export interface SeedStall {
  id: CategoryId;
  name: string;
  cuisine: string;
  tagline: string;
  description: string;
  hours: { open: string; close: string };
  capacity: number; // parallel preparation stations
  thresholds: { moderate: number; high: number }; // active orders
  q: string[];
}

export type ItemKind = 'food' | 'drink';

export interface SeedItem {
  id: string;
  stallId: CategoryId;
  kind: ItemKind;
  name: string;
  description: string;
  price: number;
  prep: number; // estimated preparation minutes
  ingredients?: string[]; // only where supplied by the brief
  q: string[];
}

/**
 * Normalise a drink name for uniqueness checks: lowercase, accents stripped, and all punctuation
 * and whitespace removed, so "Teh Tarik", "teh-tarik!" and "TehTarik" collide.
 */
export const normaliseItemName = (name: string) =>
  name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

/** Throws if any drink name (normalised) is listed under more than one stall. */
export function assertUniqueDrinks(items: Pick<SeedItem, 'name' | 'stallId' | 'kind'>[]) {
  const seen = new Map<string, string>();
  for (const it of items) {
    if (it.kind !== 'drink') continue;
    const key = normaliseItemName(it.name);
    const owner = seen.get(key);
    if (owner && owner !== it.stallId) {
      throw new Error(`Duplicate drink "${it.name}" found at both ${owner} and ${it.stallId}. Each drink must be unique to one stall.`);
    }
    seen.set(key, it.stallId);
  }
}

export const CATEGORY_ORDER: CategoryId[] = [
  'western', 'korean', 'chinese', 'japanese', 'shawarma', 'mamak', 'kopitiam', 'indian',
];

export const SEED_STALLS: SeedStall[] = [
  {
    id: 'western', name: 'Western Food', cuisine: 'Western',
    tagline: 'Pasta, grilled chicken, burgers & more.',
    description: 'Freshly prepared Western comfort food, right here on campus.',
    hours: { open: '08:00', close: '20:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Food court', 'wiki:Diner'],
  },
  {
    id: 'korean', name: 'Korean Food', cuisine: 'Korean',
    tagline: 'Fried chicken, bibimbap, tteokbokki & more.',
    description: 'Bold, saucy Korean favourites made fresh between your classes.',
    hours: { open: '10:00', close: '20:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Pojangmacha', 'wiki:Korean cuisine'],
  },
  {
    id: 'chinese', name: 'Chinese Food', cuisine: 'Chinese',
    tagline: 'Fried rice, noodles, claypot & more.',
    description: 'Wok-fresh rice and noodle classics with plenty of comfort.',
    hours: { open: '08:00', close: '20:00' }, capacity: 3, thresholds: { moderate: 5, high: 10 },
    q: ['wiki:Hawker centre', 'wiki:Chinese cuisine'],
  },
  {
    id: 'japanese', name: 'Japanese Food', cuisine: 'Japanese',
    tagline: 'Donburi, ramen, sushi & more.',
    description: 'Donburi bowls, warm noodles and sushi for a quick, tidy meal.',
    hours: { open: '10:00', close: '20:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Izakaya', 'wiki:Japanese cuisine'],
  },
  {
    id: 'shawarma', name: 'Shawarma', cuisine: 'Middle Eastern',
    tagline: 'Wraps, rice plates, platters & more.',
    description: 'Slow-roasted shawarma, wraps and bowls with house garlic sauce.',
    hours: { open: '10:00', close: '21:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Doner kebab', 'wiki:Gyro (food)'],
  },
  {
    id: 'mamak', name: 'Mamak Food', cuisine: 'Mamak',
    tagline: 'Roti canai, Maggi goreng, nasi kandar & more.',
    description: 'All-day mamak classics — flaky roti, fried noodles and rice.',
    hours: { open: '07:30', close: '21:00' }, capacity: 3, thresholds: { moderate: 5, high: 9 },
    q: ['wiki:Mamak stall', 'wiki:Malaysian cuisine'],
  },
  {
    id: 'kopitiam', name: 'Kopitiam', cuisine: 'Kopitiam',
    tagline: 'Kaya toast, chicken rice, laksa & more.',
    description: 'Old-school kopitiam breakfasts and hawker favourites.',
    hours: { open: '07:30', close: '18:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Kopitiam', 'wiki:Kopi tiam'],
  },
  {
    id: 'indian', name: 'Indian Food', cuisine: 'Indian',
    tagline: 'Briyani, banana leaf, tandoori & more.',
    description: 'Fragrant rice, rich curries and tandoori, made the traditional way.',
    hours: { open: '08:00', close: '20:00' }, capacity: 2, thresholds: { moderate: 4, high: 8 },
    q: ['wiki:Banana leaf rice', 'wiki:Thali'],
  },
];

const W = 'western', K = 'korean', C = 'chinese', J = 'japanese', S = 'shawarma', M = 'mamak', T = 'kopitiam', I = 'indian';

const SEED_FOOD: Omit<SeedItem, 'kind'>[] = [
  // ── Western ────────────────────────────────────────────────
  { id: 'wes-01', stallId: W, name: 'Spaghetti Bolognese', price: 12.90, prep: 8, description: 'Classic spaghetti served with rich tomato and minced meat sauce.', q: ['mdb:Spaghetti Bolognese', 'wiki:Bolognese sauce'] },
  { id: 'wes-02', stallId: W, name: 'Carbonara Spaghetti', price: 13.90, prep: 8, description: 'Creamy pasta with smoky chicken and a cheesy sauce.', q: ['wiki:Carbonara', 'mdb:Spaghetti alla Carbonara'] },
  { id: 'wes-03', stallId: W, name: 'Chicken Chop', price: 15.90, prep: 10, description: 'Grilled chicken served with black pepper sauce and fries.', q: ['wiki:Chicken chop', 'wiki:Chicken steak', 'mdb:Chicken Parmentier'] },
  { id: 'wes-04', stallId: W, name: 'Fish and Chips', price: 14.90, prep: 10, description: 'Crispy battered fish served with golden fries and tartar sauce.', q: ['mdb:Fish and chips', 'wiki:Fish and chips'] },
  { id: 'wes-05', stallId: W, name: 'Grilled Chicken Steak', price: 15.90, prep: 12, description: 'Juicy grilled chicken served with mashed potatoes and vegetables.', q: ['mdb:Chicken Basquaise', 'mdb:Chicken Marengo'] },
  { id: 'wes-06', stallId: W, name: 'Beef Burger', price: 12.90, prep: 8, description: 'A juicy beef patty served in a toasted bun with fresh vegetables.', q: ['wiki:Hamburger', 'mdb:Burger'] },
  { id: 'wes-07', stallId: W, name: 'Chicken Alfredo Pasta', price: 13.90, prep: 8, description: 'Creamy pasta with tender chicken and Parmesan cheese.', q: ['mdb:Chicken Alfredo Primavera', 'wiki:Fettuccine Alfredo'] },
  { id: 'wes-08', stallId: W, name: 'Chicken Lasagna', price: 14.90, prep: 6, description: 'Baked pasta layered with chicken, tomato sauce and melted cheese.', q: ['mdb:Lasagne', 'wiki:Lasagna'] },
  { id: 'wes-09', stallId: W, name: 'Chicken Wrap', price: 10.90, prep: 5, description: 'Grilled chicken and fresh vegetables wrapped in a soft tortilla.', q: ['wiki:Wrap (food)', 'wiki:Burrito', 'wiki:Fajita'] },
  { id: 'wes-10', stallId: W, name: 'Mac and Cheese', price: 9.90, prep: 5, description: 'Creamy macaroni covered with melted cheese sauce.', q: ['wiki:Macaroni and cheese', 'mdb:Macaroni Cheese'] },

  // ── Korean ─────────────────────────────────────────────────
  { id: 'kor-01', stallId: K, name: 'Korean Fried Chicken', price: 14.90, prep: 12, description: 'Crispy fried chicken coated with sweet and spicy Korean sauce.', q: ['wiki:Korean fried chicken'] },
  { id: 'kor-02', stallId: K, name: 'Bibimbap', price: 13.90, prep: 8, description: 'Korean rice bowl topped with colourful vegetables and a fried egg.', q: ['wiki:Bibimbap', 'mdb:Bibimbap'] },
  { id: 'kor-03', stallId: K, name: 'Kimchi Fried Rice', price: 11.90, prep: 7, description: 'Fried rice mixed with spicy fermented kimchi and egg.', q: ['wiki:Kimchi fried rice', 'wiki:Kimchi bokkeum-bap'] },
  { id: 'kor-04', stallId: K, name: 'Tteokbokki', price: 10.90, prep: 7, description: 'Chewy Korean rice cakes cooked in a sweet and spicy sauce.', q: ['wiki:Tteokbokki'] },
  { id: 'kor-05', stallId: K, name: 'Korean Beef Bulgogi Rice', price: 15.90, prep: 10, description: 'Sweet and savoury marinated beef served with steamed rice.', q: ['wiki:Bulgogi', 'mdb:Beef Bulgogi'] },
  { id: 'kor-06', stallId: K, name: 'Korean Ramyeon', price: 9.90, prep: 5, description: 'Spicy Korean instant noodles served with egg and vegetables.', q: ['wiki:Ramyeon', 'wiki:Shin Ramyun'] },
  { id: 'kor-07', stallId: K, name: 'Korean Cheese Corn Dog', price: 8.90, prep: 5, description: 'Crispy battered sausage and melted cheese on a stick.', q: ['wiki:Korean corn dog', 'wiki:Corn dog'] },
  { id: 'kor-08', stallId: K, name: 'Korean Chicken Bibimbap', price: 13.90, prep: 9, description: 'Rice bowl topped with spicy chicken and fresh vegetables.', q: ['wiki:Dak-galbi', 'wiki:Dakgalbi', 'wiki:Buldak'] },
  { id: 'kor-09', stallId: K, name: 'Japchae', price: 12.90, prep: 8, description: 'Korean glass noodles stir-fried with vegetables and beef.', q: ['wiki:Japchae'] },
  { id: 'kor-10', stallId: K, name: 'Korean Soy Garlic Chicken Rice', price: 13.90, prep: 11, description: 'Crispy chicken coated in sweet soy garlic sauce with rice.', q: ['wiki:Dakgangjeong', 'wiki:Yangnyeom chicken'] },

  // ── Chinese ────────────────────────────────────────────────
  { id: 'chi-01', stallId: C, name: 'Sweet and Sour Chicken Rice', price: 11.90, prep: 8, description: 'Crispy chicken coated in sweet and sour sauce served with rice.', q: ['wiki:Sweet and sour chicken', 'mdb:Sweet and Sour Pork', 'wiki:Sweet and sour'] },
  { id: 'chi-02', stallId: C, name: 'Kung Pao Chicken Rice', price: 12.90, prep: 8, description: 'Stir-fried chicken with spicy sauce and crunchy peanuts.', q: ['mdb:Kung Pao Chicken', 'wiki:Kung Pao chicken'] },
  { id: 'chi-03', stallId: C, name: 'Yangzhou Fried Rice', price: 9.90, prep: 6, description: 'Fragrant fried rice mixed with egg, vegetables and chicken.', q: ['wiki:Yangzhou fried rice', 'wiki:Fried rice'] },
  { id: 'chi-04', stallId: C, name: 'Chicken Char Siew Rice', price: 12.90, prep: 6, description: 'Roasted chicken with sweet barbecue sauce served over rice.', q: ['wiki:Char siu'] },
  { id: 'chi-05', stallId: C, name: 'Wantan Noodles', price: 10.90, prep: 6, description: 'Springy noodles served with dumplings and savoury sauce.', q: ['wiki:Wonton noodles', 'wiki:Wonton noodle'] },
  { id: 'chi-06', stallId: C, name: 'Chicken Dumpling Soup', price: 9.90, prep: 7, description: 'Soft dumplings filled with chicken served in warm soup.', q: ['wiki:Wonton', 'mdb:Wontons'] },
  { id: 'chi-07', stallId: C, name: 'Sweet Corn Egg Fried Rice', price: 8.90, prep: 5, description: 'Simple fried rice with sweet corn and scrambled egg.', q: ['wiki:Egg fried rice', 'mdb:Egg Fried Rice'] },
  { id: 'chi-08', stallId: C, name: 'Ginger Chicken Rice', price: 11.90, prep: 8, description: 'Tender chicken cooked with ginger and savoury sauce.', q: ['wiki:Three-cup chicken', 'mdb:General Tsos Chicken', 'wiki:Ginger chicken'] },
  { id: 'chi-09', stallId: C, name: 'Chinese Tomato Egg Noodles', price: 9.90, prep: 6, description: 'Noodles served with a comforting tomato and egg sauce.', q: ['wiki:Stir-fried tomato and scrambled eggs', 'wiki:Tomato egg drop soup'] },
  { id: 'chi-10', stallId: C, name: 'Claypot Chicken Rice', price: 13.90, prep: 15, description: 'Traditional rice cooked with chicken, mushrooms and soy sauce.', q: ['wiki:Claypot chicken rice', 'wiki:Claypot rice'] },

  // ── Japanese ───────────────────────────────────────────────
  { id: 'jap-01', stallId: J, name: 'Chicken Katsu Don', price: 13.90, prep: 10, description: 'Crispy chicken cutlet served over rice with egg and sauce.', q: ['wiki:Katsudon', 'mdb:Katsu Chicken curry'] },
  { id: 'jap-02', stallId: J, name: 'Chicken Teriyaki Don', price: 13.90, prep: 9, description: 'Grilled chicken glazed with sweet Japanese teriyaki sauce.', q: ['wiki:Teriyaki', 'mdb:Teriyaki Chicken Casserole'] },
  { id: 'jap-03', stallId: J, name: 'Japanese Curry Rice', price: 14.90, prep: 7, description: 'Japanese-style curry served with rice and crispy chicken.', q: ['wiki:Japanese curry', 'mdb:Katsu Chicken curry'] },
  { id: 'jap-04', stallId: J, name: 'Salmon Sushi', price: 16.90, prep: 8, description: 'Japanese rice rolls topped or filled with fresh salmon.', q: ['mdb:Sushi', 'wiki:Sushi'] },
  { id: 'jap-05', stallId: J, name: 'Chicken Ramen', price: 14.90, prep: 9, description: 'Japanese noodles served in a flavourful chicken broth.', q: ['wiki:Ramen'] },
  { id: 'jap-06', stallId: J, name: 'Tempura Prawn Udon', price: 15.90, prep: 10, description: 'Thick udon noodles served with crispy tempura prawns.', q: ['wiki:Udon', 'wiki:Tempura'] },
  { id: 'jap-07', stallId: J, name: 'Tamago Sushi', price: 8.90, prep: 4, description: 'Japanese sushi topped with sweet rolled egg.', q: ['wiki:Tamagoyaki'] },
  { id: 'jap-08', stallId: J, name: 'Gyoza', price: 9.90, prep: 7, description: 'Japanese pan-fried dumplings with a juicy filling.', q: ['wiki:Gyoza', 'wiki:Jiaozi', 'wiki:Potsticker'] },
  { id: 'jap-09', stallId: J, name: 'Japanese Yakisoba', price: 11.90, prep: 7, description: 'Stir-fried Japanese noodles with vegetables and chicken.', q: ['wiki:Yakisoba'] },
  { id: 'jap-10', stallId: J, name: 'Unagi Don', price: 19.90, prep: 9, description: 'Grilled eel glazed with sweet Japanese sauce over rice.', q: ['wiki:Unadon', 'wiki:Kabayaki', 'wiki:Unagi'] },

  // ── Shawarma (ingredients supplied by brief) ───────────────
  { id: 'sha-01', stallId: S, name: 'Chicken Shawarma Wrap', price: 9.90, prep: 5, description: 'Juicy marinated chicken wrapped in soft pita bread with fresh vegetables.', ingredients: ['Chicken', 'Pita bread', 'Lettuce', 'Tomato', 'Garlic sauce'], q: ['wiki:Shawarma'] },
  { id: 'sha-02', stallId: S, name: 'Beef Shawarma Wrap', price: 11.90, prep: 5, description: 'Tender beef slices wrapped with vegetables and creamy sauce.', ingredients: ['Beef', 'Pita bread', 'Lettuce', 'Onion', 'Tahini sauce'], q: ['wiki:Dürüm', 'wiki:Doner kebab'] },
  { id: 'sha-03', stallId: S, name: 'Chicken Shawarma Rice', price: 12.90, prep: 6, description: 'Seasoned chicken served with fragrant rice and garlic sauce.', ingredients: ['Chicken', 'Rice', 'Cucumber', 'Tomato', 'Garlic sauce'], q: ['wiki:Chicken over rice', 'wiki:Kabsa', 'wiki:Mandi (food)'] },
  { id: 'sha-04', stallId: S, name: 'Beef Shawarma Rice', price: 13.90, prep: 6, description: 'Sliced beef served over rice with fresh salad and sauce.', ingredients: ['Beef', 'Rice', 'Lettuce', 'Tomato', 'Tahini sauce'], q: ['wiki:Kabsa', 'wiki:Doner kebab'] },
  { id: 'sha-05', stallId: S, name: 'Chicken Cheese Shawarma', price: 11.90, prep: 6, description: 'Chicken shawarma wrapped with melted cheese for a creamy taste.', ingredients: ['Chicken', 'Tortilla', 'Mozzarella', 'Lettuce', 'Garlic sauce'], q: ['wiki:Quesadilla', 'wiki:Kati roll'] },
  { id: 'sha-06', stallId: S, name: 'Mixed Shawarma Platter', price: 16.90, prep: 9, description: 'A combination of chicken and beef shawarma served with fries and salad.', ingredients: ['Chicken', 'Beef', 'Fries', 'Lettuce', 'Pita bread', 'Garlic sauce'], q: ['wiki:Gyro (food)', 'wiki:Mixed grill'] },
  { id: 'sha-07', stallId: S, name: 'Falafel Wrap', price: 9.90, prep: 5, description: 'Crispy chickpea patties wrapped with fresh vegetables and tahini sauce.', ingredients: ['Chickpeas', 'Pita bread', 'Lettuce', 'Tomato', 'Tahini sauce'], q: ['wiki:Falafel'] },
  { id: 'sha-08', stallId: S, name: 'Chicken Shawarma Pita', price: 9.90, prep: 5, description: 'Marinated chicken stuffed inside soft pita bread with creamy sauce.', ingredients: ['Chicken', 'Pita bread', 'Onion', 'Cucumber', 'Garlic sauce'], q: ['wiki:Pita', 'wiki:Sabich'] },
  { id: 'sha-09', stallId: S, name: 'Beef Hummus Bowl', price: 14.90, prep: 6, description: 'Tender beef served with creamy hummus, pita bread and fresh vegetables.', ingredients: ['Beef', 'Chickpeas', 'Tahini', 'Lemon', 'Pita bread'], q: ['wiki:Hummus'] },
  { id: 'sha-10', stallId: S, name: 'Chicken Shawarma Fries', price: 10.90, prep: 6, description: 'Golden fries topped with seasoned chicken, cheese and garlic sauce.', ingredients: ['Fries', 'Chicken', 'Mozzarella', 'Garlic sauce', 'Paprika'], q: ['wiki:Cheese fries', 'wiki:Poutine', 'wiki:French fries'] },

  // ── Mamak ──────────────────────────────────────────────────
  { id: 'mam-01', stallId: M, name: 'Roti Canai', price: 2.50, prep: 4, description: 'Crispy and flaky flatbread served with dhal curry.', q: ['wiki:Roti canai'] },
  { id: 'mam-02', stallId: M, name: 'Roti Telur', price: 4.50, prep: 5, description: 'Flaky flatbread filled with egg and served with curry.', q: ['wiki:Roti telur', 'wiki:Murtabak'] },
  { id: 'mam-03', stallId: M, name: 'Maggi Goreng', price: 7.90, prep: 6, description: 'Stir-fried instant noodles with vegetables, egg and spicy sauce.', q: ['wiki:Maggi goreng', 'wiki:Indomie', 'wiki:Instant noodle'] },
  { id: 'mam-04', stallId: M, name: 'Nasi Goreng Kampung', price: 8.90, prep: 6, description: 'Traditional spicy fried rice with anchovies and vegetables.', q: ['wiki:Nasi goreng', 'mdb:Nasi lemak'] },
  { id: 'mam-05', stallId: M, name: 'Mee Goreng Mamak', price: 8.90, prep: 6, description: 'Stir-fried yellow noodles with tofu, potatoes and spicy sauce.', q: ['wiki:Mee goreng', 'wiki:Mee goreng mamak'] },
  { id: 'mam-06', stallId: M, name: 'Roti Tissue', price: 5.90, prep: 5, description: 'Extra-thin crispy flatbread shaped into a tall cone.', q: ['wiki:Roti tissue', 'wiki:Roti tisu'] },
  { id: 'mam-07', stallId: M, name: 'Nasi Kandar Ayam', price: 12.90, prep: 4, description: 'Steamed rice served with curry chicken and mixed gravies.', q: ['wiki:Nasi kandar'] },
  { id: 'mam-08', stallId: M, name: 'Roti Sardin', price: 6.90, prep: 5, description: 'Flaky flatbread filled with spicy sardine mixture.', q: ['wiki:Roti prata', 'wiki:Murtabak'] },
  { id: 'mam-09', stallId: M, name: 'Maggi Kari Telur', price: 6.90, prep: 5, description: 'Curry-flavoured noodles served with a boiled egg.', q: ['wiki:Mee kari', 'wiki:Curry noodles', 'wiki:Curry mee'] },
  { id: 'mam-10', stallId: M, name: 'Nasi Goreng Pattaya', price: 9.90, prep: 7, description: 'Fried rice wrapped in a thin omelette and topped with sauce.', q: ['wiki:Nasi goreng pattaya', 'wiki:Omurice'] },

  // ── Kopitiam ───────────────────────────────────────────────
  { id: 'kop-01', stallId: T, name: 'Kaya Butter Toast', price: 4.50, prep: 3, description: 'Crispy toasted bread spread with kaya jam and butter.', q: ['wiki:Kaya toast'] },
  { id: 'kop-02', stallId: T, name: 'Half-Boiled Eggs', price: 4.00, prep: 4, description: 'Soft-boiled eggs served with soy sauce and white pepper.', q: ['wiki:Soft-boiled egg', 'wiki:Boiled egg'] },
  { id: 'kop-03', stallId: T, name: 'Hainanese Chicken Rice', price: 10.90, prep: 4, description: 'Fragrant chicken-flavoured rice served with tender chicken and chilli sauce.', q: ['wiki:Hainanese chicken rice'] },
  { id: 'kop-04', stallId: T, name: 'Curry Laksa', price: 11.90, prep: 7, description: 'Spicy coconut curry noodle soup with tofu and chicken.', q: ['wiki:Curry laksa', 'mdb:Laksa King Prawn Noodles', 'wiki:Laksa'] },
  { id: 'kop-05', stallId: T, name: 'Char Kway Teow', price: 9.90, prep: 6, description: 'Stir-fried flat rice noodles with egg and bean sprouts.', q: ['wiki:Char kway teow'] },
  { id: 'kop-06', stallId: T, name: 'Hokkien Mee', price: 12.90, prep: 7, description: 'Thick noodles cooked in rich dark soy sauce with seafood.', q: ['wiki:Hokkien mee'] },
  { id: 'kop-07', stallId: T, name: 'Chee Cheong Fun', price: 6.90, prep: 4, description: 'Soft rice noodle rolls served with sweet sauce and sesame seeds.', q: ['wiki:Rice noodle roll', 'wiki:Chee cheong fun'] },
  { id: 'kop-08', stallId: T, name: 'Kaya French Toast', price: 6.90, prep: 5, description: 'Golden French toast filled with sweet kaya and butter.', q: ['wiki:French toast'] },
  { id: 'kop-09', stallId: T, name: 'Mee Siam', price: 8.90, prep: 6, description: 'Rice vermicelli stir-fried with a tangy and mildly spicy sauce.', q: ['wiki:Mee siam'] },
  { id: 'kop-10', stallId: T, name: 'Curry Chicken Rice', price: 10.90, prep: 4, description: 'Steamed rice served with rich Malaysian-style chicken curry.', q: ['wiki:Curry chicken', 'wiki:Chicken curry', 'mdb:Chicken Handi'] },

  // ── Indian ─────────────────────────────────────────────────
  { id: 'ind-01', stallId: I, name: 'Chicken Briyani', price: 13.90, prep: 5, description: 'Fragrant basmati rice cooked with aromatic spices and chicken.', q: ['wiki:Biryani', 'mdb:Lamb Biryani'] },
  { id: 'ind-02', stallId: I, name: 'Nasi Daun Pisang', price: 10.90, prep: 5, description: 'Traditional Indian rice meal served with vegetables and curry on a banana leaf.', q: ['wiki:Banana leaf rice', 'wiki:Sadhya'] },
  { id: 'ind-03', stallId: I, name: 'Chicken Tikka Masala', price: 14.90, prep: 8, description: 'Grilled chicken pieces cooked in creamy tomato-based curry.', q: ['wiki:Chicken tikka masala', 'mdb:Chicken Tikka Masala'] },
  { id: 'ind-04', stallId: I, name: 'Masala Dosa', price: 8.90, prep: 6, description: 'Crispy Indian pancake filled with spiced mashed potatoes.', q: ['wiki:Masala dosa', 'wiki:Dosa (food)'] },
  { id: 'ind-05', stallId: I, name: 'Chicken Tandoori', price: 14.90, prep: 10, description: 'Chicken marinated in yoghurt and spices, then roasted until tender.', q: ['wiki:Tandoori chicken', 'mdb:Tandoori chicken'] },
  { id: 'ind-06', stallId: I, name: 'Palak Paneer', price: 12.90, prep: 7, description: 'Soft Indian cheese cooked in a creamy spinach sauce.', q: ['wiki:Palak paneer', 'wiki:Saag', 'wiki:Paneer'] },
  { id: 'ind-07', stallId: I, name: 'Chana Masala', price: 9.90, prep: 5, description: 'Chickpeas cooked in a flavourful tomato and spice-based curry.', q: ['wiki:Chana masala', 'wiki:Chole'] },
  { id: 'ind-08', stallId: I, name: 'Roti Naan with Butter Chicken', price: 14.90, prep: 9, description: 'Soft naan bread served with creamy and mildly spicy butter chicken curry.', q: ['wiki:Butter chicken', 'wiki:Naan'] },
  { id: 'ind-09', stallId: I, name: 'Mutton Curry Rice', price: 15.90, prep: 5, description: 'Steamed rice served with tender mutton cooked in aromatic curry.', q: ['wiki:Mutton curry', 'mdb:Lamb Rogan josh', 'wiki:Rogan josh'] },
  { id: 'ind-10', stallId: I, name: 'Vegetable Pulao', price: 9.90, prep: 6, description: 'Fragrant basmati rice cooked with mixed vegetables and spices.', q: ['wiki:Pilaf', 'wiki:Pulao'] },
];

// ── Drinks (3 per stall, unique across stalls) ───────────────
// Not part of the original brief: prices are SAMPLE prices that vendors can edit.
const SEED_DRINK_LIST: Omit<SeedItem, 'kind'>[] = [
  { id: 'wes-d01', stallId: W, name: 'Classic Vanilla Milkshake', price: 8.90, prep: 3, description: 'Thick, creamy vanilla shake.', q: ['wiki:Milkshake'] },
  { id: 'wes-d02', stallId: W, name: 'Sparkling Lemonade', price: 5.90, prep: 2, description: 'Fizzy, freshly squeezed lemon cooler.', q: ['wiki:Lemonade', 'wiki:Lemon soda'] },
  { id: 'wes-d03', stallId: W, name: 'Iced Americano', price: 6.50, prep: 2, description: 'Double-shot espresso over ice.', q: ['wiki:Caffè Americano', 'wiki:Iced coffee'] },
  { id: 'kor-d01', stallId: K, name: 'Banana Milk', price: 5.50, prep: 1, description: 'Sweet, chilled Korean-style banana milk.', q: ['wiki:Banana Flavored Milk', 'wiki:Banana milk', 'wiki:Flavored milk'] },
  { id: 'kor-d02', stallId: K, name: 'Yuja Honey Iced Tea', price: 6.90, prep: 2, description: 'Citrusy yuzu marmalade tea over ice.', q: ['wiki:Yuja-cha', 'wiki:Yuja tea'] },
  { id: 'kor-d03', stallId: K, name: 'Misutgaru Latte', price: 7.50, prep: 2, description: 'Roasted multigrain milk drink.', q: ['wiki:Misu-garu', 'wiki:Misugaru'] },
  { id: 'chi-d01', stallId: C, name: 'Chrysanthemum Tea', price: 3.90, prep: 1, description: 'Light, floral and cooling.', q: ['wiki:Chrysanthemum tea'] },
  { id: 'chi-d02', stallId: C, name: 'Winter Melon Tea', price: 3.90, prep: 1, description: 'Caramel-sweet traditional melon tea.', q: ['wiki:Winter melon punch', 'wiki:Winter melon tea'] },
  { id: 'chi-d03', stallId: C, name: 'Soya Bean Milk', price: 3.50, prep: 1, description: 'Smooth, lightly sweetened soy milk.', q: ['wiki:Soy milk'] },
  { id: 'jap-d01', stallId: J, name: 'Iced Matcha Latte', price: 8.50, prep: 3, description: 'Stone-ground green tea with milk.', q: ['wiki:Matcha latte', 'wiki:Green tea latte', 'wiki:Matcha'] },
  { id: 'jap-d02', stallId: J, name: 'Hojicha Milk Tea', price: 7.90, prep: 3, description: 'Toasty roasted green tea latte.', q: ['wiki:Hōjicha', 'wiki:Hojicha'] },
  { id: 'jap-d03', stallId: J, name: 'Iced Genmaicha', price: 4.90, prep: 1, description: 'Green tea with roasted brown rice.', q: ['wiki:Genmaicha', 'wiki:Brown rice tea'] },
  { id: 'sha-d01', stallId: S, name: 'Mint Lemonade', price: 6.50, prep: 2, description: 'Blended lemon and fresh mint.', q: ['wiki:Limonana'] },
  { id: 'sha-d02', stallId: S, name: 'Ayran', price: 4.90, prep: 1, description: 'Chilled, lightly salted yogurt drink.', q: ['wiki:Ayran', 'wiki:Doogh'] },
  { id: 'sha-d03', stallId: S, name: 'Hibiscus Iced Tea', price: 5.50, prep: 1, description: 'Tart, ruby-red karkade tea.', q: ['wiki:Hibiscus tea'] },
  { id: 'mam-d01', stallId: M, name: 'Teh Tarik', price: 3.20, prep: 2, description: 'Frothy pulled milk tea.', q: ['wiki:Teh tarik'] },
  { id: 'mam-d02', stallId: M, name: 'Milo Dinosaur', price: 5.50, prep: 2, description: 'Iced chocolate malt topped with extra powder.', q: ['wiki:Milo dinosaur', 'wiki:Milo (drink)'] },
  { id: 'mam-d03', stallId: M, name: 'Limau Ais', price: 3.00, prep: 1, description: 'Iced calamansi lime.', q: ['wiki:Limeade', 'wiki:Lime juice'] },
  { id: 'kop-d01', stallId: T, name: 'Kopi O Ais', price: 3.20, prep: 1, description: 'Strong black kopi over ice.', q: ['wiki:Kopi', 'wiki:Kopi tubruk'] },
  { id: 'kop-d02', stallId: T, name: 'Teh C Special', price: 4.50, prep: 2, description: 'Three-layer tea with palm sugar and evaporated milk.', q: ['wiki:Teh C', 'wiki:Three layer tea', 'wiki:Hong Kong-style milk tea'] },
  { id: 'kop-d03', stallId: T, name: 'Cham Ais', price: 3.50, prep: 1, description: 'Iced coffee and tea mix.', q: ['wiki:Yuanyang (drink)', 'wiki:Yuenyeung', 'wiki:Kopi cham'] },
  { id: 'ind-d01', stallId: I, name: 'Mango Lassi', price: 6.50, prep: 2, description: 'Blended mango and yogurt.', q: ['wiki:Lassi'] },
  { id: 'ind-d02', stallId: I, name: 'Masala Chai', price: 3.50, prep: 3, description: 'Spiced milk tea.', q: ['wiki:Masala chai'] },
  { id: 'ind-d03', stallId: I, name: 'Rose Milk', price: 4.50, prep: 1, description: 'Chilled milk with rose syrup.', q: ['wiki:Rose milk'] },
];

export const SEED_DRINKS: SeedItem[] = SEED_DRINK_LIST.map((d) => ({ ...d, kind: 'drink' }));

export const SEED_ITEMS: SeedItem[] = [...SEED_FOOD.map((f) => ({ ...f, kind: 'food' as const })), ...SEED_DRINKS];

assertUniqueDrinks(SEED_ITEMS);
