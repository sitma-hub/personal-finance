import React, { useMemo } from 'react';
import { Box, Paper, Typography, Alert, CircularProgress, useTheme } from '@mui/material';
import { ResponsiveSankey, type SankeyNodeRef } from '@nivo/sankey';
import { formatCurrency } from '../../utils/currency';
import { CashFlowSankeyData, SankeyNodeKind } from '../../utils/cashFlowSankey';

/** Tuned for light backgrounds — deeper hues read clearly on white/paper. */
const NODE_COLORS_LIGHT: Record<SankeyNodeKind, string> = {
    income: '#2e7d32',
    hub: '#616161',
    expense: '#ed6c02',
    debt: '#c62828',
    investing: '#1976d2',
    surplus: '#00897b',
    shortfall: '#d32f2f',
};

/** Brighter hues for dark backgrounds — higher luminance for nodes, links, and labels. */
const NODE_COLORS_DARK: Record<SankeyNodeKind, string> = {
    income: '#81c784',
    hub: '#b0bec5',
    expense: '#ffb74d',
    debt: '#ef5350',
    investing: '#64b5f6',
    surplus: '#4db6ac',
    shortfall: '#ff5252',
};

type SankeyGraphNode = {
    id: string;
    label: string;
    kind: SankeyNodeKind;
};

type SankeyGraphLink = {
    source: string;
    target: string;
    value: number;
};

type CashFlowSankeyChartProps = {
    data: CashFlowSankeyData;
    loading?: boolean;
    ready?: boolean;
    height?: number;
};

function buildGraph(data: CashFlowSankeyData): {
    nodes: SankeyGraphNode[];
    links: SankeyGraphLink[];
    kindById: Map<string, SankeyNodeKind>;
} {
    const kindById = new Map(data.nodes.map((n) => [n.id, n.kind]));
    return {
        nodes: data.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind })),
        links: data.links.map((l) => ({
            source: l.source,
            target: l.target,
            value: l.value,
        })),
        kindById,
    };
}

const NodeTooltip: React.FC<{
    node: { id: string | number; label?: string | number; value?: number };
    kindById: Map<string, SankeyNodeKind>;
    monthlyIncome: number;
}> = ({ node, kindById, monthlyIncome }) => {
    const id = String(node.id);
    const label = String(node.label ?? id);
    const value = Number(node.value ?? 0);
    const kind = kindById.get(id) ?? 'hub';
    const share =
        monthlyIncome > 0 && kind !== 'hub' && kind !== 'shortfall'
            ? ` (${((value / monthlyIncome) * 100).toFixed(1)}% of income)`
            : '';

    return (
        <Paper elevation={3} sx={{ p: 1.5, minWidth: 160 }}>
            <Typography variant="subtitle2" fontWeight={600}>
                {label}
            </Typography>
            <Typography variant="body2">
                {formatCurrency(value)}
                {share}
            </Typography>
        </Paper>
    );
};

export const CashFlowSankeyChart: React.FC<CashFlowSankeyChartProps> = ({
    data,
    loading = false,
    ready = true,
    height = 360,
}) => {
    const muiTheme = useTheme();
    const isDark = muiTheme.palette.mode === 'dark';
    const nodeColors = isDark ? NODE_COLORS_DARK : NODE_COLORS_LIGHT;
    const labelColor = muiTheme.palette.text.primary;

    const { nodes, links, kindById } = useMemo(() => buildGraph(data), [data]);
    const labelById = useMemo(() => new Map(nodes.map((n) => [n.id, n.label])), [nodes]);
    const monthlyIncome = data.meta.monthlyIncome;

    const sankeyTheme = useMemo(
        () => ({
            text: {
                fontSize: 11,
                fill: labelColor,
            },
            labels: {
                text: {
                    fill: labelColor,
                },
            },
        }),
        [labelColor]
    );

    if (loading || !ready) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height={height}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    if (!data.meta.hasRenderableFlow) {
        return (
            <Alert severity="info">
                Add income streams on the Income page and expenses or liabilities to see where your money
                goes each month.
            </Alert>
        );
    }

    return (
        <Box>
            {data.meta.isDeficit && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Monthly expenses and planned contributions exceed income by{' '}
                    {formatCurrency(Math.abs(data.meta.monthlySavings))}. The diagram includes a
                    shortfall (drawdown) source so flows balance.
                </Alert>
            )}
            <Box sx={{ width: '100%', height: { xs: 320, md: height } }}>
                <ResponsiveSankey
                    data={{ nodes, links }}
                    margin={{ top: 24, right: 200, bottom: 24, left: 200 }}
                    align="justify"
                    colors={(node: SankeyNodeRef) =>
                        nodeColors[kindById.get(String(node.id)) ?? 'hub']
                    }
                    nodeOpacity={1}
                    nodeHoverOpacity={1}
                    nodeThickness={16}
                    nodeSpacing={20}
                    nodeBorderWidth={isDark ? 1 : 0}
                    nodeBorderColor={isDark ? muiTheme.palette.divider : undefined}
                    linkOpacity={isDark ? 0.55 : 0.45}
                    linkHoverOpacity={isDark ? 0.75 : 0.65}
                    linkContract={2}
                    enableLinkGradient
                    label={(node: SankeyNodeRef) =>
                        labelById.get(String(node.id)) ?? String(node.id)
                    }
                    labelPosition="outside"
                    labelOrientation="horizontal"
                    labelPadding={12}
                    labelTextColor={
                        isDark
                            ? labelColor
                            : { from: 'color', modifiers: [['darker', 1.2]] }
                    }
                    theme={sankeyTheme}
                    nodeTooltip={({ node }: { node: SankeyNodeRef }) => (
                        <NodeTooltip
                            node={{
                                id: node.id,
                                label: labelById.get(String(node.id)) ?? String(node.id),
                                value: node.value,
                            }}
                            kindById={kindById}
                            monthlyIncome={monthlyIncome}
                        />
                    )}
                />
            </Box>
        </Box>
    );
};
