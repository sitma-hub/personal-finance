import React, { useEffect, useRef, useState } from 'react';

type ChartContainerProps = {
    height: number | string;
    width?: string;
    children: (size: { width: number; height: number }) => React.ReactNode;
};

export const ChartContainer: React.FC<ChartContainerProps> = ({
    height,
    width = '100%',
    children,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const initialHeight = typeof height === 'number' ? height : 300;
    const [size, setSize] = useState({ width: 0, height: initialHeight });

    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;

        const update = (widthPx: number, heightPx: number) => {
            if (widthPx > 0 && heightPx > 0) {
                setSize({ width: widthPx, height: heightPx });
            }
        };

        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width: w, height: h } = entry.contentRect;
            update(w, h);
        });
        ro.observe(el);

        const rect = el.getBoundingClientRect();
        update(rect.width, rect.height);

        return () => ro.disconnect();
    }, []);

    return (
        <div ref={ref} style={{ width, height, position: 'relative' }}>
            {size.width > 0 && size.height > 0 && children(size)}
        </div>
    );
};
