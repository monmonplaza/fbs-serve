import { Icon } from '@/components/Icon';
import type { ModuleId } from '@/api/types';
import { useUi } from '@/store/ui';

interface Guide { v: ModuleId; ic: string; t: string; d: string; s: string[] }
const GUIDE: Guide[] = [
  { v: 'dashboard', ic: 'dash', t: 'Dashboard', d: 'See how the day is going at a glance.', s: ['Check income today and the amount still to collect.', 'Count today’s orders, paid and open.', 'See the top 5 foods ordered today.', 'Check how many tables are active and inactive.'] },
  { v: 'tables', ic: 'table', t: 'Tables', d: 'Seat guests, collect payment and reset tables.', s: ['When guests sit at an inactive table, select it and tap Activate table. This always comes first.', 'Show the QR to the guests. Every guest at the table scans the same code.', 'When a table shows Bill out, go to it and tap Receive payment.', 'After cleaning, tap Mark as clean. The old QR stops working.', 'Tap Arrange tables and drag each table to where it sits in your restaurant.'] },
  { v: 'kitchen', ic: 'pot', t: 'Kitchen', d: 'Cook orders in the order they arrived.', s: ['New orders appear in Queued, oldest at the top.', 'Tap the button on a card to move it: Cooking, Plating, Order out.', 'Guests see every change on their phone right away.', 'Waiters tap Mark as served after bringing the food to the table.'] },
  { v: 'orders', ic: 'receipt', t: 'Orders', d: 'Find any order, in any status.', s: ['Pick Today, This week or This month.', 'Type an order ID in the search box to find it on any date.', 'Select a row to see its items, payment and discount.'] },
  { v: 'orders', ic: 'bag', t: 'Takeout', d: 'Orders to go, paid on pickup.', s: ['At the counter: in Orders, tap New takeout order, enter the name and add food. It goes straight to the kitchen.', 'Self-order: put the Takeout QR (in Orders) at the counter. Customers order on their phone and get a pickup number.', 'Kitchen cards for takeout are tagged Takeout and move like dine-in. In Order out, pack it and tap Ready for pickup. The card leaves the kitchen.', 'Ready orders appear under Ready for pickup in Orders. Tap Collect payment as you hand the food over. That marks it paid and picked up.'] },
  { v: 'reservations', ic: 'calendar', t: 'Reservations', d: 'Book tables ahead and keep track of who is coming.', s: ['Switch between Month, Week and List. Select a day to see its reservations, and use the arrows or Today to move around.', 'Tap New reservation (or the + on a day) and enter the guest, date, time and table. Turn on Advance order to pick the food they want ready.', 'Reschedule from the reservation, or drag it to another day on the calendar. Cancel keeps a record, and you can restore it.', '20 minutes before the time, a banner appears on every screen. Tap Seat now to activate the table. The advance order goes on its plate.', 'A table shows Reserved in its own color from an hour before the booking.'] },
  { v: 'foods', ic: 'utensils', t: 'Foods', d: 'Keep the menu up to date.', s: ['Tap Add food and fill in the name, category, price and description.', 'Add photos for the gallery, the prep time guests see as the estimated wait, and tags: New, Must try or Best seller.', 'If a food comes in sizes or portions, such as a pizza or a drink, tap Add variant and give each one a name and its own price. The food then shows From and the lowest price, and guests pick one when they add it.', 'Set a food to Not available when it runs out. Guests cannot order it.', 'Switch between Cards and Table view.'] },
  { v: 'settings', ic: 'sliders', t: 'Settings', d: 'Set up how the restaurant runs.', s: ['Payment methods: choose what guests can pick when they ask for the bill.', 'Discounts: set the percent off and what the guest must show.', 'Users and roles: decide who can open each module.', 'Categories: group foods on the menu.', 'Tables and floor levels: add, rename or remove tables, set their seats, and add a 2nd floor.'] },
];
const FLOW: [string, string][] = [
  ['Waiter', 'Activates the inactive table the guests sat at. Its QR code appears.'], ['Guests', 'Add food to one shared plate. One guest sends it to the kitchen.'],
  ['Kitchen', 'Moves the order: Cooking, Plating, Order out.'], ['Waiter', 'Brings the food. The table becomes Eating.'],
  ['Guest', 'Taps Bill out and picks a payment method. The waiter is called.'], ['Waiter', 'Collects payment, cleans, and marks the table clean.'],
];

export function GuidePage() {
  const { go, set } = useUi();
  return (
    <>
      <div className="page-head"><div><h1>Guide</h1><p className="muted">How each part of FBS Serve works.</p></div></div>
      <section className="card"><div className="card-head"><h3>From QR to clean table</h3></div>
        <ol className="flow">{FLOW.map(([w, d], i) => <li key={i}><span className="n">{i + 1}</span><b>{w}</b><span className="caption muted">{d}</span></li>)}</ol>
      </section>
      <div className="guide-grid">
        {GUIDE.map(g => (
          <article key={g.t} className="card gcard"><div className="gi"><Icon name={g.ic} /></div><h3>{g.t}</h3><p className="muted">{g.d}</p>
            <ol>{g.s.map((x, i) => <li key={i}>{x}</li>)}</ol>
            <button className="btn btn-outline" onClick={() => go(g.v)}>Open {g.t}</button>
          </article>
        ))}
        <article className="card gcard"><div className="gi"><Icon name="phone" /></div><h3>Guest phone</h3><p className="muted">What guests see after scanning the QR.</p>
          <ol>
            <li>Browse the menu. Tap a photo to open the gallery and zoom in. Tap Add to put a dish on the plate.</li>
            <li>Check Your plate. Everyone at the table shares it.</li>
            <li>One guest taps Send to kitchen.</li>
            <li>Follow the order live, then tap Bill out to pay.</li>
          </ol>
          <button className="btn btn-outline" onClick={() => set({ mode: 'guest' })}>Preview guest view</button>
        </article>
      </div>
    </>
  );
}
