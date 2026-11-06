import { Icon } from "@/components/Icon";
import { useToastStore } from "@/context/toast";

export function Toast() {
    const message = useToastStore((s) => s.message);
    return (
        <div id="toast" role="status" hidden={!message}>
            {message && (
                <>
                    <Icon name="check" size={20} />
                    {message}
                </>
            )}
        </div>
    );
}
