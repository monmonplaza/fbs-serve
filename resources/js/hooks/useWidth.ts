import { useLayoutEffect, useRef, useState } from "react";

/** Width of an element, so an SVG chart can draw at real pixels and keep its text crisp. Attach `ref` to the chart's box. */
export function useWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, w] as const;
}
