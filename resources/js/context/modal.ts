import type { ReactNode } from "react";
import { create } from "zustand";

export interface ModalSpec {
    title: ReactNode;
    /** Body and footer, including their `.m-body` / `.m-foot` wrappers (a form can wrap both). */
    content: ReactNode;
    wide?: boolean;
    /** Icon name for the header. Guessed from the title when omitted. */
    icon?: string;
}
interface ModalState {
    spec: ModalSpec | null;
    open: (s: ModalSpec) => void;
    close: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
    spec: null,
    open: (spec) => set({ spec }),
    close: () => set({ spec: null }),
}));
export const openModal = (spec: ModalSpec) => useModalStore.getState().open(spec);
export const closeModal = () => useModalStore.getState().close();
