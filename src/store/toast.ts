import { create } from 'zustand';

interface ToastState { message: string | null; show: (m: string) => void; hide: () => void }
let timer: ReturnType<typeof setTimeout>;

export const useToastStore = create<ToastState>(set => ({
  message: null,
  show: m => { clearTimeout(timer); set({ message: m }); timer = setTimeout(() => set({ message: null }), 2600); },
  hide: () => set({ message: null }),
}));
/** Shows a short confirmation at the bottom of the screen. */
export const toast = (message: string) => useToastStore.getState().show(message);
