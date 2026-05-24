import React from 'react';
import {
    Box,
    Paper,
    Typography,
    Alert,
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { formatChartAxisThousands, formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';
import type { PayoffChartRow, PayoffScenario, PayoffScheduleResult } from '../../utils/liabilityPayoffProjection';

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

const PayoffChartTooltip: React.FC<
    TooltipProps<number, string> & { series: PayoffChartSeries[] }
> = ({ active, payload, label, series }) => {
    if (!active || !payload?.length) return null;
    const month = String(label ?? '');
    const seriesById = new Map(series.map((s) => [s.scenario.id, s]));

    return (
        <Paper elevation={3} sx={{ p: 1.5, minWidth: 200 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {formatChartMonthLabel(month)}
            </Typography>
            {payload
                .filter((entry) => entry.value != null)
                .map((entry) => {
                    const meta = seriesById.get(String(entry.dataKey));
                    const point = meta?.result.points.find((p) => p.month === month);
                    return (
                        <Box key={String(entry.dataKey)} sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ color: entry.color }}>
                                {meta?.scenario.label ?? entry.name}: {formatCurrency(Number(entry.value))}
                            </Typography>
                            {point && point.cumulativeInterest > 0 && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Interest to date: {formatCurrency(point.cumulativeInterest)}
                                </Typography>
                            )}
                        </Box>
                    );
                })}
        </Paper>
    );
};

export const LiabilityPayoffChart: React.FC<LiabilityPayoffChartProps> = ({
    series,
    chartRows,
    height = 280,
}) => {
    const amortizeWarnings = series.filter((s) => s.result.doesNotAmortize);
    const unpaidWarnings = series.filter(
        (s) => s.result.monthsToPayoff == null && s.result.startingBalance > 0
    );

    if (series.length === 0) {
        return (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                Select at least one scenario to display the payoff chart.
            </Typography>
        );
    }

    if (series.every((s) => s.result.startingBalance <= 0)) {
        return (
            <Alert severity="success" sx={{ mt: 1 }}>
                This liability is already paid off.
            </Alert>
        );
    }

    return (
        <Box>
            {amortizeWarnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Regular payment does not cover monthly interest — the balance may not decrease on the baseline
                    plan.
                </Alert>
            )}
            {unpaidWarnings.length > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Payoff extends beyond 50 years for some scenarios; chart shows the first 600 months.
                </Alert>
            )}
            <Box sx={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartRows} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11 }}
                            minTickGap={48}
                            interval="preserveStartEnd"
                            tickFormatter={(month) => formatChartMonthLabel(String(month))}
                        />
                        <YAxis tickFormatter={formatChartAxisThousands} width={72} />
                        <Tooltip content={<PayoffChartTooltip series={series} />} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#666" strokeDasharray="4 4" />
                        {series.map(({ scenario, color }) => (
                            <Line
                                key={scenario.id}
                                type="monotone"
                                dataKey={scenario.id}
                                name={scenario.label}
                                stroke={color}
                                strokeWidth={2}
                                dot={false}
                                connectNulls={false}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
};
