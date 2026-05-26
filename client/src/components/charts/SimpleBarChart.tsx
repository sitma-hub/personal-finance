import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import '../../chartjs/register';
import { formatCurrency } from '../../utils/currency';
import { ChartContainer } from './ChartContainer';
import {
    baseCartesianOptions,
    chartTooltipPlugin,
    currencyLinearScale,
    namedCategoryScale,
} from './chartTheme';

export type BarDatum = {
    name: string;
    value: number;
    color?: string;
};

type SimpleBarChartProps = {
    data: BarDatum[];
    height?: number;
    tooltipLabel?: string;
    defaultColor?: string;
};

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
    data,
    height = 300,
    tooltipLabel = 'Amount',
    defaultColor = '#4caf50',
}) => {
    const muiTheme = useTheme();

    const chartData = useMemo(
        () => ({
            labels: data.map((d) => d.name),
            datasets: [
                {
                    data: data.map((d) => d.value),
                    backgroundColor: data.map((d) => d.color ?? defaultColor),
                    borderRadius: 4,
                },
            ],
        }),
        [data, defaultColor],
    );

    const options = useMemo(
        () => ({
            ...baseCartesianOptions(),
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...chartTooltipPlugin(muiTheme),
                    callbacks: {
                        label: (ctx: { parsed: { y: number | null } }) =>
                            `${tooltipLabel}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
                    },
                },
            },
            scales: {
                x: namedCategoryScale(muiTheme),
                y: currencyLinearScale(muiTheme),
            },
        }),
        [muiTheme, tooltipLabel],
    );

    if (data.length === 0) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.7 }}>No data</span>
            </div>
        );
    }

    return (
        <ChartContainer height={height}>
            {({ width, height: h }) => (
                <Bar data={chartData} options={options} width={width} height={h} />
            )}
        </ChartContainer>
    );
};
