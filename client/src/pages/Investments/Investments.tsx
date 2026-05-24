import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    Button,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
    Line,
    LineChart,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@mui/material';
import { useFinancial } from '../../contexts/FinancialContext';
import { projectionService } from '../../services/projectionService';
import { InvestableHistoryPoint, InvestmentProjectionsResponse } from '../../types';
import { formatChartAxisThousands, formatCurrency } from '../../utils/currency';
import { formatChartMonthLabel } from '../../utils/dateInput';

const formatPct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

type InvestmentChartRow = {
    month: string;
    actual: number | null;
    expected: number | null;
    pessimistic: number | null;
    optimistic: number | null;
};

const SERIES_LABELS: Record<string, string> = {
    actual: 'Recorded value',
    expected: 'Forecast (expected)',
    pessimistic: 'Forecast (pessimistic)',
    optimistic: 'Forecast (optimistic)',
};

const InvestmentChartTooltip: React.FC<TooltipProps<number, string>> = ({
    active,
    payload,
    label,
}) => {
    if (!active || !payload?.length) return null;
    const month = String(payload[0]?.payload?.month ?? label ?? '');
    return (
        <Paper elevation={3} sx={{ p: 1.5, minWidth: 180 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                {formatChartMonthLabel(month)}
            </Typography>
            {payload
                .filter((entry) => entry.value != null)
                .map((entry) => (
                    <Typography key={entry.dataKey} variant="body2" sx={{ color: entry.color }}>
                        {SERIES_LABELS[String(entry.dataKey)] ?? entry.name}:{' '}
                        {formatCurrency(Number(entry.value))}
                    </Typography>
                ))}
        </Paper>
    );
};

const BucketSparkline: React.FC<{ points: InvestableHistoryPoint[] }> = ({ points }) => {
    if (points.length < 2) {
        return (
            <Typography variant="caption" color="text.secondary">
                —
            </Typography>
        );
    }

    const trendUp = points[points.length - 1].actual >= points[0].actual;

    return (
        <Box sx={{ width: 96, height: 32 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={trendUp ? '#2e7d32' : '#c62828'}
                        strokeWidth={1.5}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
};

const Investments: React.FC = () => {
    const navigate = useNavigate();
    const { state } = useFinancial();
    const { summary } = state;
    const [years, setYears] = useState<5 | 10 | 20>(10);
    const [data, setData] = useState<InvestmentProjectionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        projectionService
            .getInvestmentProjections(years)
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch(() => {
                if (!cancelled) setError('Failed to load projections');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [years]);

    const surplus = summary?.monthlySavings ?? 0;
    const plannedDca = data?.totalMonthlyContribution ?? 0;
    const afterDca = surplus - plannedDca;

    const chartData = useMemo((): InvestmentChartRow[] => {
        const historical: InvestmentChartRow[] = (data?.historySeries || []).map((point) => ({
            month: point.month,
            actual: point.actual,
            expected: null,
            pessimistic: null,
            optimistic: null,
        }));

        const forecast: InvestmentChartRow[] = (data?.totalsSeries || []).map((point) => ({
            month: point.month,
            actual: null,
            expected: point.expected,
            pessimistic: point.pessimistic,
            optimistic: point.optimistic,
        }));

        return [...historical, ...forecast].sort((a, b) => a.month.localeCompare(b.month));
    }, [data]);

    const hasHistory = chartData.some((row) => row.actual != null);
    const hasForecast = chartData.some((row) => row.expected != null);
    const hasChart = hasHistory || hasForecast;

    if (loading && !data) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4">Investments</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/assets')}
                >
                    Add investment bucket
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Alert severity="info" sx={{ mb: 3 }}>
                Track ETF buckets under <Link component={RouterLink} to="/assets">Assets</Link> (investment or retirement type).
                Set monthly contribution and return scenarios here — not under Expenses. Update values over time to see how
                market fluctuations affect your portfolio.
            </Alert>

            {data && (
                <>
                    <Grid container spacing={3} mb={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" variant="body2">Investable value now</Typography>
                                    <Typography variant="h5">{formatCurrency(data.totalCurrentValue)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" variant="body2">Planned DCA / month</Typography>
                                    <Typography variant="h5">{formatCurrency(plannedDca)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" variant="body2">Monthly surplus</Typography>
                                    <Typography variant="h5" color={surplus >= 0 ? 'success.main' : 'error.main'}>
                                        {formatCurrency(surplus)}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">Income − living − debt</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" variant="body2">After planned DCA</Typography>
                                    <Typography variant="h5" color={afterDca >= 0 ? 'success.main' : 'error.main'}>
                                        {formatCurrency(afterDca)}
                                    </Typography>
                                    {afterDca < 0 && (
                                        <Typography variant="caption" color="error">
                                            DCA exceeds surplus — adjust plan or expenses
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
                            <Typography variant="h6">Investable value over time</Typography>
                            <ToggleButtonGroup
                                size="small"
                                value={years}
                                exclusive
                                onChange={(_, v) => v && setYears(v)}
                            >
                                <ToggleButton value={5}>5y</ToggleButton>
                                <ToggleButton value={10}>10y</ToggleButton>
                                <ToggleButton value={20}>20y</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                        {!hasChart ? (
                            <Alert severity="warning">
                                No buckets in forecast. Add an investment account with expected return and enable
                                &quot;Include in forecast&quot;. Update bucket values on{' '}
                                <Link component={RouterLink} to="/assets">Assets</Link> or via{' '}
                                <Link component={RouterLink} to="/check-in">monthly check-in</Link> to build history.
                            </Alert>
                        ) : (
                            <Box sx={{ width: '100%', height: { xs: 300, lg: 400 } }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="month"
                                            tick={{ fontSize: 11 }}
                                            minTickGap={48}
                                            interval="preserveStartEnd"
                                            tickFormatter={(month) => formatChartMonthLabel(String(month))}
                                        />
                                        <YAxis tickFormatter={formatChartAxisThousands} width={72} />
                                        <Tooltip content={<InvestmentChartTooltip />} />
                                        <Legend />
                                        {hasForecast && (
                                            <>
                                                <Area
                                                    type="monotone"
                                                    dataKey="optimistic"
                                                    stroke="#64b5f6"
                                                    fill="#64b5f6"
                                                    fillOpacity={0.15}
                                                    name="Forecast (optimistic)"
                                                    connectNulls
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="pessimistic"
                                                    stroke="#90caf9"
                                                    fill="#90caf9"
                                                    fillOpacity={0.08}
                                                    name="Forecast (pessimistic)"
                                                    connectNulls
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="expected"
                                                    stroke="#1976d2"
                                                    strokeWidth={2}
                                                    strokeDasharray="6 4"
                                                    dot={false}
                                                    name="Forecast (expected)"
                                                    connectNulls
                                                />
                                            </>
                                        )}
                                        {hasHistory && (
                                            <Line
                                                type="monotone"
                                                dataKey="actual"
                                                stroke="#1565c0"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                name="Recorded value"
                                                connectNulls
                                            />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                        {!hasHistory && hasForecast && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No recorded history yet. Update bucket values on{' '}
                                <Link component={RouterLink} to="/assets">Assets</Link> or use{' '}
                                <Link component={RouterLink} to="/check-in">monthly check-in</Link> to track how your
                                investments move with the market.
                            </Alert>
                        )}
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                            Recorded values reflect updates you enter for investment buckets. Forecast scenarios are
                            illustrative only — not guaranteed returns.
                        </Typography>
                    </Paper>

                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Investment buckets</Typography>
                        {data.assets.length === 0 ? (
                            <Typography color="textSecondary">No investment buckets yet.</Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell align="right">Value</TableCell>
                                            <TableCell>History</TableCell>
                                            <TableCell align="right">€/mo</TableCell>
                                            <TableCell align="right">Expected return</TableCell>
                                            <TableCell align="right">10y range</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.assets.map((a) => (
                                            <TableRow key={a.id}>
                                                <TableCell>{a.name}</TableCell>
                                                <TableCell>
                                                    <Chip size="small" label={a.type.replace(/_/g, ' ')} variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(a.currentValue)}</TableCell>
                                                <TableCell>
                                                    <BucketSparkline points={data.assetHistories?.[a.id] ?? []} />
                                                </TableCell>
                                                <TableCell align="right">{formatCurrency(a.monthlyContribution)}</TableCell>
                                                <TableCell align="right">{formatPct(a.expectedAnnualReturn)}</TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(a.projectedAt10y.pessimistic)}
                                                    {' – '}
                                                    {formatCurrency(a.projectedAt10y.optimistic)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </>
            )}
        </Box>
    );
};

export default Investments;
