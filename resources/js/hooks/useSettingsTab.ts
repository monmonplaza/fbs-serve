import { create } from "zustand";
import { useUi } from "@/context/ui";

export const useSettingsTab = create<{ tab: string; setTab: (t: string) => void }>((set) => ({
    tab: "payments",
    setTab: (tab) => set({ tab }),
}));
/** Opens Settings on a tab (the prototype's goto-set). Unknown tabs fall back to the current one. */
export const goToSettingsTab = (tab: string) => {
    useSettingsTab.getState().setTab(tab);
    useUi.getState().go("settings");
};
