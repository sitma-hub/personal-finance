import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import {
    Box,
    Typography,
    Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import '../../chartjs/register';
import { formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';
import type { PayoffChartRow, PayoffScenario, PayoffScheduleResult } from '../../utils/liabilityPayoffProjection';
import { ChartContainer } from './ChartContainer';
import { useTranslation } from 'react-i18next';
import {
    baseCartesianOptions,
    chartLegendLabels,
    chartTooltipPlugin,
    currencyLinearScale,
    monthCategoryScale,
} from './chartTheme';

export type PayoffChartSeries = {
    scenario: PayoffScenario;
    result: PayoffScheduleResult;
    color: string;
};

type LiabilityPayoffChartProps = {
    series: PayoffChartSeries[];
    chartRows: PayoffChartRow[];
    height?: number;
};

export const LiabilityPayoffChart: React.FC<LiabilityPayoffChartProps> = ({
    series,
    chartRows,
    height = 280,
}) => {
    const muiTheme = useTheme();
    const { t } = useTranslation();
    const amortizeWarnings = series.filter((s) => s.result.doesNotAmortize);
    const unpaidWarnings = series.filter(
        (s) => s.result.monthsToPayoff == null && s.result.startingBalance > 0
    );

    const labels = useMemo(() => chartRows.map((row) => row.month), [chartRows]);
    const seriesById = useMemo(() => new Map(series.map((s) => [s.scenario.id, s])), [series]);

    const chartData: ChartData<'line'> = useMemo(
        () => ({
            labels,
            datasets: series.map(({ scenario, color }) => ({
                label: scenario.label,
                data: chartRows.map((row) => {
                    const value = row[scenario.id];
                    return typeof value === 'number' ? value : null;
                }),
                borderColor: color,
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: false,
                scenarioId: scenario.id,
            })),
        }),
        [chartRows, labels, series],
    );

    const options: ChartOptions<'line'> = useMemo(
        () => ({
            ...baseCartesianOptions(),
            plugins: {
                legend: {
                    labels: chartLegendLabels(muiTheme),
                },
                tooltip: {
                    ...chartTooltipPlugin(muiTheme),
                    callbacks: {
                        title: (items) => formatChartMonthLabel(labels[items[0]?.dataIndex ?? 0] ?? ''),
                        label: (ctx) => {
                            const scenarioId = (ctx.dataset as { scenarioId?: string }).scenarioId;
                            const meta = scenarioId ? seriesById.get(scenarioId) : undefined;
                            const month = labels[ctx.dataIndex];
                            const point = meta?.result.points.find((p) => p.month === month);
                            const lines = [
                                `${meta?.scenario.label ?? ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
                            ];
                            if (point && point.cumulativeInterest > 0) {
                                lines.push(
                                    t('pages.liabilities.payoffChart.interestToDate', {
                                        amount: formatCurrency(point.cumulativeInterest),
                                    })
                                );
                            }
                            return lines;
                        },
                    },
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: muiTheme.palette.divider,
                            borderWidth: 1,
                            borderDash: [4, 4],
                        },
                    },
                },
            },
            scales: {
                x: monthCategoryScale(muiTheme, labels),
                y: currencyLinearScale(muiTheme),
            },
        }),
        [labels, muiTheme, seriesById],
    );

    if (series.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                {t('pages.liabilities.payoffChart.selectScenario')}
            </Typography>
        );
    }

    if (series.every((s) => s.result.startingBalance <= 0)) {
        return (
            <Alert severity="success" sx={{ mt: 1 }}>
                {t('pages.liabilities.payoffChart.alreadyPaidOff')}
            </Alert>
        );
    }

    return (
        <Box>
            {amortizeWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {t('pages.liabilities.payoffChart.warningNotAmortizing')}
                </Alert>
            )}
            {unpaidWarnings.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {t('pages.liabilities.payoffChart.warningBeyond50y')}
                </Alert>
            )}
            <ChartContainer height={height}>
                {({ width, height: h }) => (
                    <Line data={chartData} options={options} width={width} height={h} />
                )}
            </ChartContainer>
        </Box>
    );
};
