import { Icon } from "@/components/Icon";
import { useToastStore } from "@/context/toast";
import { useUi } from "@/context/ui";

export function Toast() {
    const message = useToastStore((s) => s.message);
    // On the guest phone the bottom holds the Menu / Plate / Orders / Bill tabs, so messages show at the top there.
    const guest = useUi((s) => s.mode === "guest" || s.guestOnly);
    return (
        <div id="toast" className={guest ? "top" : undefined} role="status" hidden={!message}>
            {message && (
                <>
                    <Icon name="check" size={20} />
                    {message}
                </>
            )}
        </div>
    );
}
