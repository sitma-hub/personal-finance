import React, { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { Chart } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '../../chartjs/register';
import { formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';
import { ChartContainer } from './ChartContainer';
import {
    baseCartesianOptions,
    chartLegendLabels,
    chartTooltipPlugin,
    currencyLinearScale,
    monthCategoryScale,
} from './chartTheme';

export type ForecastChartRow = {
    month: string;
    actual: number | null;
    expected: number | null;
    pessimistic: number | null;
    optimistic: number | null;
    assetsExpected?: number;
    liabilities?: number;
};

const DEFAULT_SERIES_LABELS: Record<string, string> = {
    actual: 'Recorded (snapshots)',
    expected: 'Forecast (expected)',
    pessimistic: 'Forecast (pessimistic)',
    optimistic: 'Forecast (optimistic)',
};

const SCENARIO_KEYS = ['pessimistic', 'optimistic', 'expected', 'actual'] as const;

type ForecastRangeChartProps = {
    data: ForecastChartRow[];
    height: number | string;
    hasHistory?: boolean;
    hasForecast?: boolean;
    seriesLabels?: Record<string, string>;
    onPointClick?: (row: ForecastChartRow, scenarioKey: string) => void;
    showAssetLiabilityFooter?: boolean;
};

const seriesValue = (rows: ForecastChartRow[], key: keyof ForecastChartRow): (number | null)[] =>
    rows.map((row) => {
        const value = row[key];
        return typeof value === 'number' ? value : null;
    });

export const ForecastRangeChart: React.FC<ForecastRangeChartProps> = ({
    data,
    height,
    hasHistory = true,
    hasForecast = true,
    seriesLabels = DEFAULT_SERIES_LABELS,
    onPointClick,
    showAssetLiabilityFooter = false,
}) => {
    const muiTheme = useTheme();
    const labels = useMemo(() => data.map((row) => row.month), [data]);

    const chartData: ChartData<'line'> = useMemo(() => {
        const datasets: ChartData<'line'>['datasets'] = [];

        if (hasForecast) {
            datasets.push({
                label: seriesLabels.pessimistic ?? 'Forecast (pessimistic)',
                data: seriesValue(data, 'pessimistic'),
                borderColor: '#bbdefb',
                backgroundColor: 'transparent',
                pointRadius: 0,
                borderWidth: 1,
                spanGaps: true,
                scenarioKey: 'pessimistic',
            } as ChartData<'line'>['datasets'][number] & { scenarioKey: string });

            datasets.push({
                label: seriesLabels.optimistic ?? 'Forecast (optimistic)',
                data: seriesValue(data, 'optimistic'),
                borderColor: '#90caf9',
                backgroundColor: 'rgba(144, 202, 249, 0.2)',
                pointRadius: 0,
                borderWidth: 1,
                fill: '-1',
                spanGaps: true,
                scenarioKey: 'optimistic',
            } as ChartData<'line'>['datasets'][number] & { scenarioKey: string });

            datasets.push({
                label: seriesLabels.expected ?? 'Forecast (expected)',
                data: seriesValue(data, 'expected'),
                borderColor: '#1976d2',
                backgroundColor: 'transparent',
                pointRadius: 0,
                borderWidth: 2,
                borderDash: [6, 4],
                spanGaps: true,
                scenarioKey: 'expected',
            } as ChartData<'line'>['datasets'][number] & { scenarioKey: string });
        }

        if (hasHistory) {
            datasets.push({
                label: seriesLabels.actual ?? 'Recorded (snapshots)',
                data: seriesValue(data, 'actual'),
                borderColor: '#1565c0',
                backgroundColor: 'transparent',
                pointRadius: 3,
                borderWidth: 2,
                spanGaps: true,
                scenarioKey: 'actual',
            } as ChartData<'line'>['datasets'][number] & { scenarioKey: string });
        }

        return { labels, datasets };
    }, [data, hasForecast, hasHistory, labels, seriesLabels]);

    const options: ChartOptions<'line'> = useMemo(
        () => ({
            ...baseCartesianOptions(),
            onClick: (_event, elements, chart) => {
                if (!onPointClick || elements.length === 0) return;
                const element = elements[0];
                const dataset = chart.data.datasets[element.datasetIndex] as { scenarioKey?: string };
                const scenarioKey = dataset.scenarioKey ?? SCENARIO_KEYS[element.datasetIndex] ?? 'actual';
                const row = data[element.index];
                if (row) onPointClick(row, scenarioKey);
            },
            plugins: {
                legend: {
                    labels: chartLegendLabels(muiTheme),
                },
                tooltip: {
                    ...chartTooltipPlugin(muiTheme),
                    callbacks: {
                        title: (items) => {
                            const month = labels[items[0]?.dataIndex ?? 0] ?? '';
                            return formatChartMonthLabel(month);
                        },
                        label: (ctx) => {
                            const key =
                                (ctx.dataset as { scenarioKey?: string }).scenarioKey ??
                                SCENARIO_KEYS[ctx.datasetIndex];
                            const label = seriesLabels[key] ?? ctx.dataset.label ?? key;
                            return `${label}: ${formatCurrency(ctx.parsed.y ?? 0)}`;
                        },
                        footer: (items) => {
                            if (!showAssetLiabilityFooter || items.length === 0) return [];
                            const row = data[items[0].dataIndex];
                            if (row?.assetsExpected == null) return [];
                            return [
                                `Assets (forecast): ${formatCurrency(row.assetsExpected)} · Liabilities: ${formatCurrency(row.liabilities ?? 0)}`,
                            ];
                        },
                    },
                },
            },
            scales: {
                x: monthCategoryScale(muiTheme, labels),
                y: currencyLinearScale(muiTheme),
            },
        }),
        [data, labels, muiTheme, onPointClick, seriesLabels, showAssetLiabilityFooter],
    );

    return (
        <ChartContainer height={height}>
            {({ width, height: h }) => (
                <Chart type="line" data={chartData} options={options} width={width} height={h} />
            )}
        </ChartContainer>
    );
};
