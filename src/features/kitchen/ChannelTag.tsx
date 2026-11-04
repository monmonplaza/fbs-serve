import type { Order } from '@/api/types';

const CHAN = { walkin: { l: 'Walk-in', c: 'var(--brand)' }, grab: { l: 'GrabFood', c: '#00B14F' }, panda: { l: 'Foodpanda', c: '#D70F64' } };

/** Where a takeout order comes from. */
export function ChannelTag({ o, extra = '' }: { o: Order; extra?: string }) {
  const c = CHAN[o.channel ?? 'walkin'] ?? CHAN.walkin;
  return <span className={`chan ${extra}`}><i style={{ background: c.c }} />Takeout · {c.l}</span>;
}
