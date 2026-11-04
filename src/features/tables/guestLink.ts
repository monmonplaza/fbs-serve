import type { DiningTable } from '@/api/types';

/** The link the table QR code opens: the guest phone for that table and session. */
export const guestLink = (t: Pick<DiningTable, 'id' | 'token'>) =>
  location.href.split('#')[0] + '#t=' + encodeURIComponent(t.id) + '&k=' + t.token;
