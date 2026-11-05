import { create } from 'zustand';
import type { ModuleId } from '@/api/types';
import { TO } from '@/api/constants';

export interface Notif { id: number; ic: string; text: string; view: ModuleId; at: number; read: boolean }

interface UiState {
  /** Staff screens, or the guest phone preview. */
  mode: 'staff' | 'guest';
  /** Opened from a QR code: only the guest phone, no staff chrome. */
  guestOnly: boolean;
  view: ModuleId;
  meId: string;
  signedOut: boolean;
  notifs: Notif[];
  guest: { table: string; name: string; tab: 'menu' | 'plate' | 'orders' | 'bill'; cat: string };
  set: (p: Partial<Omit<UiState, 'set' | 'notify' | 'go'>>) => void;
  setGuest: (p: Partial<UiState['guest']>) => void;
  /** Adds an entry to the bell. Newest first, last 40 kept. */
  notify: (ic: string, text: string, view: ModuleId) => void;
  go: (view: ModuleId) => void;
}

let seq = 0;
export const useUi = create<UiState>((set, get) => ({
  mode: 'staff', guestOnly: false, view: 'dashboard', meId: 'u1', signedOut: true, notifs: [],
  guest: { table: 'T3', name: 'Guest 1', tab: 'menu', cat: 'all' },
  set: p => set(p),
  setGuest: p => set({ guest: { ...get().guest, ...p } }),
  notify: (ic, text, view) => set({ notifs: [{ id: ++seq, ic, text, view, at: Date.now(), read: false }, ...get().notifs].slice(0, 40) }),
  go: view => { set({ view, mode: 'staff' }); scrollTo(0, 0); },
}));

// Opened from a table QR code (#t=<table>&k=<token>) or the Takeout QR (#takeout): show only the guest phone.
export const bootFromHash = () => {
  const q = new URLSearchParams(location.hash.slice(1)), t = q.get('t'), k = q.get('k');
  if (t && k) useUi.setState({ guestOnly: true, mode: 'guest', guest: { table: t, name: 'Guest ' + (10 + Math.floor(Math.random() * 90)), tab: 'menu', cat: 'all' } });
  else if (q.has('takeout')) useUi.setState({ guestOnly: true, mode: 'guest', guest: { table: TO, name: 'Guest 1', tab: 'menu', cat: 'all' } });
  return { table: t, token: k };
};
