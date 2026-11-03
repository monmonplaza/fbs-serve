// @ts-nocheck -- sample data generator, thrown away when the backend provides real data.
// Builds the sample database the mock API starts from. A real backend replaces this with its own data.
import type { Database, DiningTable, Order, OrderItem, OrderStatus, PlateLine } from './types';
import { categories, discounts, floors, foods, payments, roles, tables, users } from './seedData';
import { hasV, itemName, orderEta, unitPrice } from '@/lib/domain';
import { uid } from '@/lib/format';

function rng(seed: number){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

const tableOf = (db: Database, id: string) => db.tables.find(t => t.id === id)!;
export const nextId = (db: Database) => 'ORD-' + (++db.orderSeq);
export const nextPickup = (db: Database) => 'TO-' + String(++db.takeoutSeq).padStart(3, '0');

const PHOTO_COLORS = {
  appetizer:['#C2702B','#E0A24A','#7A3E12','#6E9A2C'], main:['#8B4A1F','#B5651D','#5B7F2A','#D9A441'],
  drinks:['#F2C14E','#E8D9A8','#9CCB5A','#C9772E'], dessert:['#8E5BB5','#F2D16B','#F7F1E1','#C2702B'], sidedish:['#F3E7C9','#D9A441','#6E9A2C','#B5651D'],
};
// Drawn stand-in photos so the gallery has something to show before real photos are uploaded.
function samplePhoto(f, v){
  const r = rng(hash(f.id + v)), pal = PHOTO_COLORS[f.cat] || PHOTO_COLORS.main;
  const bg = ['#D8C7AE', '#2E2A26', '#B9A588'][v % 3];
  const cx = [400, 330, 470][v % 3], cy = [300, 320, 280][v % 3], pr = [210, 290, 180][v % 3];
  let dish = '';
  if (f.cat === 'drinks'){
    dish = `<rect x="${cx - 70}" y="${cy - 150}" width="140" height="250" rx="18" fill="#ffffff" fill-opacity=".35"/><rect x="${cx - 62}" y="${cy - 90}" width="124" height="182" rx="14" fill="${pal[0]}"/><circle cx="${cx + 30}" cy="${cy - 120}" r="26" fill="${pal[2]}"/>`;
  } else {
    for (let i = 0; i < 9; i++){
      const a = r() * 6.28, d = r() * pr * .55;
      dish += `<ellipse cx="${(cx + Math.cos(a) * d).toFixed(0)}" cy="${(cy + Math.sin(a) * d).toFixed(0)}" rx="${(30 + r() * 50).toFixed(0)}" ry="${(24 + r() * 40).toFixed(0)}" fill="${pal[i % pal.length]}" opacity=".92"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${bg}"/><circle cx="${cx + 12}" cy="${cy + 16}" r="${pr + 22}" fill="#000" opacity=".18"/><circle cx="${cx}" cy="${cy}" r="${pr + 22}" fill="#F7F5F0"/><circle cx="${cx}" cy="${cy}" r="${pr - 8}" fill="#ECE8DF"/>${dish}${v === 2 ? `<circle cx="660" cy="470" r="80" fill="#F7F5F0"/><circle cx="660" cy="470" r="58" fill="${pal[1]}"/>` : ''}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function seedOrders(db: Database){
  
  const r = rng(11), pick = a => a[Math.floor(r() * a.length)];
  const NAMES = ['Ana Cruz', 'Mark Lim', 'Joy Tan', 'Paolo Reyes', 'Bea Santos', 'Carlo Diaz'];
  const asTO = (o, pickup) => { const c = pick(NAMES), ch = pick(['walkin', 'walkin', 'grab', 'panda']); Object.assign(o, {type:'takeout', table:null, pickup, customer:c, by:c, phone:'', source:ch === 'walkin' ? pick(['counter', 'qr']) : 'counter', channel:ch, ref:ch === 'walkin' ? '' : (ch === 'grab' ? 'GF-' : 'FP-') + (1000 + Math.floor(r() * 9000))}); if (ch !== 'walkin' && o.status === 'paid') o.payment = ch; };
  const mk = (when, status, table, extra = {}) => {
    const items = [], n = 1 + Math.floor(r() * 4);
    while (items.length < n){
      const f = pick(db.foods);
      if (!items.some(i => i.foodId === f.id)){ const v = hasV(f) ? pick(f.variants) : null; items.push({foodId:f.id, variantId:v?.id, name:itemName(f, v?.id), price:unitPrice(f, v?.id), qty:1 + Math.floor(r() * 2)}); }
    }
    db.orders.push({id:nextId(db), table, session:'old', items, status, createdAt:+when, by:'Guest 1', eta:orderEta(items, db.foods), ...extra});
  };
  for (let d = 34; d >= 1; d--){
    const n = 8 + Math.floor(r() * 9);
    let dn = 0;
    for (let i = 0; i < n; i++){
      const w = new Date(); w.setDate(w.getDate() - d); w.setHours(11 + Math.floor(r() * 10), Math.floor(r() * 60), 0, 0);
      mk(w, 'paid', 'T' + (1 + Math.floor(r() * 12)), {payment:pick(['cash','gcash','card']), discount:r() < .12 ? {name:'Senior citizen', pct:20} : null, paidAt:+w + 3e6});
      if (r() < .2) asTO(db.orders.at(-1), 'TO-' + String(++dn).padStart(3, '0'));
    }
  }
  for (let i = 9; i >= 1; i--){
    mk(Date.now() - (60 + i * 22) * 60000, 'paid', 'T' + (1 + Math.floor(r() * 12)), {payment:pick(['cash','gcash','card']), discount:null, paidAt:Date.now() - i * 20 * 60000});
    if (i % 4 === 0) asTO(db.orders.at(-1), nextPickup(db));
  }
  // Live floor
  const open = (id, status, minsAgo, orders = [], bill = null) => {
    const t = tableOf(db, id); t.status = status; t.token = uid(); t.openedAt = Date.now() - minsAgo * 60000; t.bill = bill;
    orders.forEach(([st, ago, by]) => { mk(Date.now() - ago * 60000, st, id, {by}); const o = db.orders.at(-1); o.session = t.token; if (st === 'served') o.servedAt = Date.now() - (ago - 18) * 60000; });
  };
  open('T1', 'ordering', 30, [['completed', 22, 'Guest 1']]);
  open('T2', 'ordering', 24, [['completed', 16, 'Guest 2']]);
  open('T3', 'active', 4);
  open('T4', 'ordering', 9, [['queued', 2, 'Guest 1']]);
  open('T5', 'eating', 55, [['served', 41, 'Guest 1'], ['served', 20, 'Guest 3']]);
  open('T6', 'ordering', 14, [['cooking', 6, 'Guest 2']]);
  open('T7', 'billout', 75, [['served', 62, 'Guest 1']], {method:'gcash', at:Date.now() - 2 * 60000});
  open('T8', 'cleaning', 90, [['paid', 80, 'Guest 1']]);
  open('T9', 'ordering', 20, [['plating', 11, 'Guest 4']]);
  // Live takeout: one ready for pickup at the counter, one in Order out, one cooking, one just placed from the Takeout QR (the guest preview's own order).
  [['ready', 18], ['completed', 14], ['cooking', 8], ['queued', 3]].forEach(([st, ago], i) => { mk(Date.now() - ago * 60000, st, null); asTO(db.orders.at(-1), nextPickup(db)); const ch = ['grab', 'panda', 'walkin', 'walkin'][i]; Object.assign(db.orders.at(-1), {channel:ch, source:'counter', ref:ch === 'grab' ? 'GF-4821' : ch === 'panda' ? 'FP-7305' : ''}); });
  Object.assign(db.orders.at(-1), {source:'qr', phone:'0917 555 0199'}); db.demoTakeoutId = db.orders.at(-1).id;
  db.orders.filter(o => o.table === 'T8' && o.status === 'paid' && o.session !== 'old').forEach(o => { o.payment = 'cash'; o.discount = null; o.paidAt = Date.now() - 6 * 60000; });
  db.plates.T3 = [
    {id:uid(), foodId:'f6', qty:2, by:'Guest 1'},
    {id:uid(), foodId:'f9', qty:2, by:'Guest 1'},
    {id:uid(), foodId:'f14', variantId:'reg', qty:1, by:'Guest 2'},
  ];
}

function seedReservations(db: Database){
  const now = Date.now(), min = n => now + n * 60000;
  const at = (dayOff, h, m = 0) => { const d = new Date(now); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return +d; };
  const ord = (...rows) => rows.map(([fid, vid, qty]) => { const f = db.foods.find(x => x.id === fid)!; return {foodId:fid, variantId:vid, name:itemName(f, vid), price:unitPrice(f, vid), qty}; });
  const mk = (name, phone, pax, when, tableId, extra = {}) => db.reservations.push({id:uid(), name, phone, pax, at:when, tableId, note:'', status:'booked', order:null, history:[{at:now - 2 * 86400000, text:'Booked'}], ...extra});
  mk('Santos family', '0917 555 0142', 4, min(18), 'T15', {note:'Birthday. Bring a candle.', order:ord(['f18', 'lg', 1], ['f6', undefined, 2], ['f12', 'lg', 2])});
  mk('Reyes', '0918 555 0177', 2, min(50), 'T11');
  mk('Garcia', '0920 555 0108', 2, min(-190), 'T9', {status:'arrived'});
  mk('Lim', '0917 555 0123', 6, at(1, 19), 'T8', {order:ord(['f4', undefined, 1], ['f5', undefined, 1], ['f9', undefined, 4])});
  mk('Ramos', '0919 555 0166', 5, at(1, 12), 'T9');
  mk('Dela Cruz', '0921 555 0190', 8, at(2, 12, 30), 'T14', {note:'Company lunch. Needs a receipt.'});
  mk('Tan', '0922 555 0135', 3, at(3, 18, 30), null);
  mk('Bautista', '0917 555 0188', 2, at(5, 20), null, {status:'cancelled', cancelReason:'Changed plans'});
  mk('Aquino', '0916 555 0172', 6, at(7, 11, 30), 'T8');
  mk('Villanueva', '0915 555 0120', 10, at(9, 18), 'T13', {note:'Anniversary dinner.', order:ord(['f19', 'plt', 2], ['f18', 'md', 2], ['f13', undefined, 2])});
  mk('Mendoza', '0916 555 0150', 4, at(-1, 19), 'T5', {status:'noshow'});
  mk('Torres', '0917 555 0111', 2, at(-4, 13), 'T1', {status:'arrived'});
}

export function createDatabase(): Database {
  const db: Database = {
    categories: structuredClone(categories), foods: structuredClone(foods), payments: structuredClone(payments), discounts: structuredClone(discounts),
    roles: structuredClone(roles), users: structuredClone(users), floors: structuredClone(floors), tables: structuredClone(tables),
    orders: [], plates: {}, reservations: [], settings: { tableTimerOn: false, tableTimerMins: 60 }, orderSeq: 1000, takeoutSeq: 0,
  };
  db.foods.forEach(f => (f.photos = [0, 1, 2].map(v => samplePhoto(f, v))));
  seedOrders(db);
  seedReservations(db);
  return db;
}
