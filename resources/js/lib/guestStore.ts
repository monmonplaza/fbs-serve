import { create } from "zustand";

/** Takeout orders this phone placed (the guest only sees their own). Seeded with the demo order in the staff preview. */
interface MineState {
    ids: string[];
    add: (id: string) => void;
    seed: (id: string | null) => void;
}
export const useMyTakeouts = create<MineState>((set, get) => ({
    ids: [],
    add: (id) => set({ ids: [...get().ids, id] }),
    seed: (id) => {
        if (id && !get().ids.includes(id)) set({ ids: [...get().ids, id] });
    },
}));
