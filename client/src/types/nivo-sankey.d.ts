declare module '@nivo/sankey' {
    import type { FC, ReactNode } from 'react';

    export type SankeyNodeRef = {
        id: string | number;
        value?: number;
        label?: string | number;
    };

    export type ResponsiveSankeyProps = {
        data: {
            nodes: Array<{ id: string; label?: string; [key: string]: unknown }>;
            links: Array<{ source: string; target: string; value: number }>;
        };
        margin?: { top?: number; right?: number; bottom?: number; left?: number };
        align?: 'center' | 'justify' | 'start' | 'end';
        colors?: (node: SankeyNodeRef) => string;
        nodeOpacity?: number;
        nodeHoverOpacity?: number;
        nodeThickness?: number;
        nodeSpacing?: number;
        nodeBorderWidth?: number;
        nodeBorderColor?: string;
        linkOpacity?: number;
        linkHoverOpacity?: number;
        linkContract?: number;
        enableLinkGradient?: boolean;
        label?: (node: SankeyNodeRef) => string;
        labelPosition?: 'inside' | 'outside';
        labelOrientation?: 'horizontal' | 'vertical';
        labelPadding?: number;
        labelTextColor?: string | { from: string; modifiers?: Array<[string, number]> };
        theme?: { text?: { fontSize?: number } };
        nodeTooltip?: (props: { node: SankeyNodeRef }) => ReactNode;
    };

    export const ResponsiveSankey: FC<ResponsiveSankeyProps>;
}
