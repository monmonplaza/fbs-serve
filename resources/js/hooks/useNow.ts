import { useEffect, useState } from "react";

/** Re-renders on an interval so "5 min ago" and reminder windows stay current. */
export function useNow(ms = 30000) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(id);
    }, [ms]);
    return now;
}
