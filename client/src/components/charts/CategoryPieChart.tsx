import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/currency';

export type PieDatum = {
    name: string;
    value: number;
    color?: string;
};

const DEFAULT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export type PieLegendMode = 'percent' | 'amount';

type CategoryPieChartProps = {
    data: PieDatum[];
    height?: number;
    formatValue?: (value: number) => string;
    tooltipLabel?: string;
    emptyMessage?: string;
    /** Legend shows share (default) or formatted amount */
    legendMode?: PieLegendMode;
};

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
    data,
    height = 300,
    formatValue = formatCurrency,
    tooltipLabel = 'Amount',
    emptyMessage = 'No data',
    legendMode = 'percent',
}) => {
    const slices = data
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value);
    const total = slices.reduce((sum, d) => sum + d.value, 0);

    if (slices.length === 0) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.7 }}>{emptyMessage}</span>
            </div>
        );
    }

    const legendFormatter = (name: string) => {
        const item = slices.find((d) => d.name === name);
        if (!item || total <= 0) return name;
        if (legendMode === 'amount') {
            return `${name} ${formatValue(item.value)}`;
        }
        const pct = ((item.value / total) * 100).toFixed(0);
        return `${name} ${pct}%`;
    };

    const outerRadius = Math.min(height * 0.36, 100);

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="38%"
                    cy="50%"
                    outerRadius={outerRadius}
                    label={false}
                    isAnimationActive={false}
                >
                    {slices.map((entry, index) => (
                        <Cell
                            key={entry.name}
                            fill={entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value: number) => [formatValue(value), tooltipLabel]}
                />
                <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={legendFormatter}
                    wrapperStyle={{
                        fontSize: 13,
                        lineHeight: 1.65,
                        maxWidth: '52%',
                        paddingLeft: 8,
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};
