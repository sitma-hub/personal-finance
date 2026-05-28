import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import type { Chart, ChartData, ChartOptions } from 'chart.js';
import '../../chartjs/register';
import { formatCurrency } from '../../utils/currency';
import { ChartContainer } from './ChartContainer';
import { getChartSeriesColors } from '../../theme/tokens';

export type PieDatum = {
    name: string;
    value: number;
    color?: string;
};

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
    const muiTheme = useTheme();
    const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
    const labelColor = muiTheme.palette.text.primary;
    const tooltipColors = useMemo(
        () => ({
            backgroundColor: muiTheme.palette.background.paper,
            titleColor: muiTheme.palette.text.primary,
            bodyColor: muiTheme.palette.text.secondary,
            borderColor: muiTheme.palette.divider,
        }),
        [muiTheme],
    );

    const slices = useMemo(
        () => data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value),
        [data],
    );
    const seriesColors = useMemo(() => getChartSeriesColors(muiTheme), [muiTheme]);
    const colors = slices.map(
        (entry, index) => entry.color ?? seriesColors[index % seriesColors.length],
    );

    const chartData: ChartData<'doughnut'> = useMemo(
        () => ({
            labels: slices.map((d) => d.name),
            datasets: [
                {
                    data: slices.map((d) => d.value),
                    backgroundColor: colors,
                    borderWidth: 0,
                },
            ],
        }),
        [slices, colors],
    );

    const options: ChartOptions<'doughnut'> = useMemo(
        () => ({
            responsive: false,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 12, right: 12, bottom: 12, left: 12 },
            },
            plugins: {
                legend: {
                    position: isMobile ? 'bottom' : 'right',
                    align: 'center',
                    labels: {
                        color: labelColor,
                        font: { size: 13 },
                        padding: 10,
                        generateLabels: (chart: Chart<'doughnut'>) => {
                            const dataset = chart.data.datasets[0];
                            const sliceTotal = (dataset.data as number[]).reduce(
                                (sum, value) => sum + Number(value),
                                0,
                            );
                            const labels = (chart.data.labels ?? []) as string[];
                            return labels.map((label, index) => {
                                const value = Number(dataset.data[index]);
                                const text =
                                    legendMode === 'amount'
                                        ? `${label} ${formatValue(value)}`
                                        : `${label} ${sliceTotal > 0 ? ((value / sliceTotal) * 100).toFixed(0) : 0}%`;
                                const fill =
                                    (Array.isArray(dataset.backgroundColor)
                                        ? dataset.backgroundColor[index]
                                        : dataset.backgroundColor) ?? '#666';
                                return {
                                    text: String(text),
                                    fillStyle: String(fill),
                                    strokeStyle: String(fill),
                                    fontColor: labelColor,
                                    color: labelColor,
                                    lineWidth: 0,
                                    hidden: false,
                                    index,
                                };
                            });
                        },
                    },
                },
                tooltip: {
                    ...tooltipColors,
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => {
                            const value = Number(ctx.parsed);
                            return `${tooltipLabel}: ${formatValue(value)}`;
                        },
                    },
                },
            },
        }),
        [formatValue, isMobile, labelColor, legendMode, tooltipColors, tooltipLabel],
    );

    if (slices.length === 0) {
        return (
            <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ opacity: 0.7 }}>{emptyMessage}</span>
            </div>
        );
    }

    return (
        <ChartContainer height={height}>
            {({ width, height: h }) => (
                <Doughnut data={chartData} options={options} width={width} height={h} />
            )}
        </ChartContainer>
    );
};
