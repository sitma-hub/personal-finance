import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    Alert,
    Button,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Snackbar,
    Link,
    ToggleButton,
    ToggleButtonGroup,
    TextField,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    EuroSymbol as MoneyIcon,
    CreditCard as DebtIcon,
    Savings as SavingsIcon,
    CameraAlt as SnapshotIcon,
    Refresh as RefreshIcon,
    ShowChart as ShowChartIcon,
    EventNote as CheckInIcon,
} from '@mui/icons-material';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
    Area,
} from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import type { TooltipProps } from 'recharts';
import { useFinancial } from '../../contexts/FinancialContext';
import {
    formatChartMonthLabel,
    formatLocaleDate,
    currentMonth,
    findMissingSnapshotMonths,
    getRecommendedMonth,
    normalizeSnapshotMonth,
} from '../../utils/dateInput';
import type { CheckInStatus, NetWorthProjectionsResponse } from '../../types';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { NetWorthStepModal } from '../../components/dashboard/NetWorthStepModal';
import { projectionService } from '../../services/projectionService';
import { formatChartAxisThousands, formatCurrency } from '../../utils/currency';
import {
    buildNetWorthStepBreakdown,
    resolveClickedScenario,
    type NetWorthChartRow,
    type NetWorthStepBreakdown,
} from '../../utils/netWorthStepBreakdown';

const MIN_FORECAST_YEARS = 1;
const MAX_FORECAST_YEARS = 40;

type ForecastPreset = '5' | '10' | '20' | 'custom';

const clampForecastYears = (years: number): number =>
    Math.min(MAX_FORECAST_YEARS, Math.max(MIN_FORECAST_YEARS, years));

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const currentMonthLabel = (): string => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const SERIES_LABELS: Record<string, string> = {
    actual: 'Recorded (snapshots)',
    expected: 'Forecast (expected)',
    pessimistic: 'Forecast (pessimistic)',
    optimistic: 'Forecast (optimistic)',
};

const NetWorthChartTooltip: React.FC<TooltipProps<number, string>> = ({
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
            {payload[0]?.payload?.assetsExpected != null && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Assets (forecast): {formatCurrency(Number(payload[0].payload.assetsExpected))}
                    {' · '}
                    Liabilities: {formatCurrency(Number(payload[0].payload.liabilities))}
                </Typography>
            )}
        </Paper>
    );
};

const UnifiedDashboard: React.FC = () => {
    const { state, refresh, saveSnapshot } = useFinancial();
    const {
        summary,
        allocation,
        netWorthHistory,
        netWorthProjections,
        recentUpdates,
        loading,
        error,
        snapshots,
    } = state;
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState<string | null>(null);
    const [chartsReady, setChartsReady] = useState(false);
    const [forecastPreset, setForecastPreset] = useState<ForecastPreset>('10');
    const [customYearsInput, setCustomYearsInput] = useState('15');
    const [forecastProjections, setForecastProjections] = useState<NetWorthProjectionsResponse | null>(null);
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastError, setForecastError] = useState<string | null>(null);
    const [stepBreakdown, setStepBreakdown] = useState<NetWorthStepBreakdown | null>(null);

    const forecastYears = useMemo(() => {
        if (forecastPreset === 'custom') {
            const parsed = parseInt(customYearsInput, 10);
            return clampForecastYears(Number.isFinite(parsed) ? parsed : 15);
        }
        return Number(forecastPreset);
    }, [forecastPreset, customYearsInput]);

    useEffect(() => {
        if (loading) {
            setChartsReady(false);
            return undefined;
        }
        const id = window.requestAnimationFrame(() => setChartsReady(true));
        return () => window.cancelAnimationFrame(id);
    }, [loading]);

    useEffect(() => {
        if (forecastYears === netWorthProjections?.years && netWorthProjections) {
            setForecastProjections(netWorthProjections);
        }
    }, [netWorthProjections, forecastYears]);

    useEffect(() => {
        if (forecastYears === netWorthProjections?.years && netWorthProjections) {
            return undefined;
        }

        let cancelled = false;
        setForecastLoading(true);
        setForecastError(null);

        projectionService
            .getNetWorthProjections(forecastYears)
            .then((res) => {
                if (!cancelled) {
                    setForecastProjections(res.data ?? null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setForecastError('Failed to load forecast for selected horizon');
                    setForecastProjections(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setForecastLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [forecastYears, netWorthProjections]);

    const checkInStatus = useMemo((): CheckInStatus | null => {
        if (loading) return null;
        const snapshotMonths = snapshots
            .map((s) => normalizeSnapshotMonth(s.snapshot_month))
            .filter((m): m is string => m != null);
        const cur = currentMonth();
        const missingMonths = findMissingSnapshotMonths(snapshotMonths, cur);
        const sorted = [...snapshotMonths].sort();
        return {
            missingMonths,
            recommendedMonth: getRecommendedMonth(missingMonths, snapshotMonths, cur),
            lastSnapshotMonth: sorted.length > 0 ? (sorted[sorted.length - 1] ?? null) : null,
            currentMonth: cur,
        };
    }, [loading, snapshots]);

    const activeProjections = forecastProjections ?? netWorthProjections;

    const payoffEvents = activeProjections?.payoffEvents ?? [];
    const hasPayoffForecast = payoffEvents.length > 0 && (activeProjections?.payoffInvestingSeries?.length ?? 0) > 0;

    const chartData = useMemo((): NetWorthChartRow[] => {
        const historical: NetWorthChartRow[] = netWorthHistory.map((h) => ({
            month: h.month,
            kind: 'snapshot',
            actual: h.netWorth,
            expected: null,
            pessimistic: null,
            optimistic: null,
            assetsExpected: h.assets,
            liabilities: h.liabilities,
        }));

        const forecastSource = hasPayoffForecast
            ? activeProjections!.payoffInvestingSeries!
            : (activeProjections?.series || []);

        const forecast: NetWorthChartRow[] = forecastSource.map((p) => ({
            month: p.month,
            kind: 'forecast',
            actual: null,
            expected: p.netWorthExpected,
            pessimistic: p.netWorthPessimistic,
            optimistic: p.netWorthOptimistic,
            assetsExpected: p.assetsExpected,
            assetsPessimistic: p.assetsPessimistic,
            assetsOptimistic: p.assetsOptimistic,
            liabilities: p.liabilities,
        }));

        return [...historical, ...forecast].sort((a, b) => a.month.localeCompare(b.month));
    }, [netWorthHistory, activeProjections, hasPayoffForecast]);

    const handleChartClick = (chartState: { activePayload?: Array<{ payload?: NetWorthChartRow; dataKey?: string }> } | null) => {
        const payload = chartState?.activePayload?.[0];
        if (!payload?.payload) return;

        const row = payload.payload;
        const scenario = resolveClickedScenario(
            payload.dataKey != null ? String(payload.dataKey) : undefined,
            row
        );
        const index = chartData.findIndex((d) => d.month === row.month);
        const prevRow = index > 0 ? chartData[index - 1] ?? null : null;

        const breakdown = buildNetWorthStepBreakdown({
            row,
            prevRow,
            clickedScenario: scenario,
            snapshots,
            netWorthHistory,
            payoffEvents,
            plannedMonthlyContributions:
                activeProjections?.plannedMonthlyContributions ?? plannedInvesting,
        });

        if (breakdown) {
            setStepBreakdown(breakdown);
        }
    };

    const plannedInvesting = netWorthProjections?.plannedMonthlyContributions ?? 0;

    const handleSaveSnapshot = async () => {
        const existing = snapshots.some((s) => {
            const m = typeof s.snapshot_month === 'string'
                ? s.snapshot_month.substring(0, 7)
                : new Date(s.snapshot_month).toISOString().substring(0, 7);
            const now = new Date().toISOString().substring(0, 7);
            return m === now;
        });
        if (existing && !window.confirm(`A snapshot for ${currentMonthLabel()} already exists. Overwrite?`)) {
            return;
        }
        setSaving(true);
        try {
            await saveSnapshot();
            setSnack(`Net worth recorded for ${currentMonthLabel()}`);
        } catch {
            setSnack('Failed to save snapshot');
        } finally {
            setSaving(false);
        }
    };

    if (loading && !summary) {
        return (
            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px" gap={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">Loading financial data…</Typography>
            </Box>
        );
    }

    if (!loading && !summary) {
        return (
            <Box sx={{ width: '100%' }}>
                <Typography variant="h4" mb={2}>Dashboard</Typography>
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={() => refresh()}>
                            Retry
                        </Button>
                    }
                >
                    {error || 'Unable to load dashboard data. Make sure the API server is running.'}
                </Alert>
            </Box>
        );
    }

    const pieData = allocation.map((a, i) => ({
        name: a.type.replace(/_/g, ' '),
        value: a.value,
        color: COLORS[i % COLORS.length],
    }));

    const hasChart = chartData.some((d) => d.actual != null)
        || chartData.some((d) => d.expected != null);

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4">Dashboard</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Button startIcon={<RefreshIcon />} onClick={() => refresh()}>Refresh</Button>
                    <Button
                        variant="outlined"
                        startIcon={<SnapshotIcon />}
                        onClick={handleSaveSnapshot}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Quick save current month'}
                    </Button>
                    <Button
                        variant="contained"
                        component={RouterLink}
                        to={
                            checkInStatus?.missingMonths.length
                                ? `/check-in?month=${checkInStatus.missingMonths[0]}`
                                : '/check-in'
                        }
                        startIcon={<CheckInIcon />}
                    >
                        Monthly check-in
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {checkInStatus && checkInStatus.missingMonths.length > 0 && (
                <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            component={RouterLink}
                            to={`/check-in?month=${checkInStatus.missingMonths[0]}`}
                        >
                            Fill gaps
                        </Button>
                    }
                >
                    {checkInStatus.missingMonths.length} month{checkInStatus.missingMonths.length === 1 ? '' : 's'} missing
                    in your snapshot history. Use monthly check-in to backfill with proposed values.
                </Alert>
            )}

            {summary && (
                <Grid container spacing={3} mb={3} sx={{ width: '100%' }}>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <MoneyIcon color="primary" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" variant="body2">Net worth</Typography>
                                        <Typography variant="h5">{formatCurrency(summary.netWorth)}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <TrendingUpIcon color="success" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" variant="body2">Assets</Typography>
                                        <Typography variant="h5">{formatCurrency(summary.totalAssets)}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <DebtIcon color="error" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" variant="body2">Liabilities</Typography>
                                        <Typography variant="h5">{formatCurrency(summary.totalLiabilities)}</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <SavingsIcon sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" variant="body2">Monthly cash flow</Typography>
                                        <Typography variant="h5" color={summary.monthlySavings >= 0 ? 'success.main' : 'error.main'}>
                                            {formatCurrency(summary.monthlySavings)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center">
                                    <ShowChartIcon sx={{ mr: 2 }} color="info" />
                                    <Box>
                                        <Typography color="textSecondary" variant="body2">
                                            <Link component={RouterLink} to="/investments" underline="hover">
                                                Planned investing
                                            </Link>
                                        </Typography>
                                        <Typography variant="h5">{formatCurrency(plannedInvesting)}/mo</Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Grid container spacing={3} sx={{ width: '100%' }}>
                <Grid item xs={12}>
                    <Paper sx={{ p: 2, width: '100%' }}>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            flexWrap="wrap"
                            gap={1}
                            mb={1}
                        >
                            <Typography variant="h6">Net worth over time</Typography>
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={forecastPreset}
                                    onChange={(_, value: ForecastPreset | null) => {
                                        if (value) setForecastPreset(value);
                                    }}
                                    aria-label="Forecast horizon"
                                >
                                    <ToggleButton value="5">5y</ToggleButton>
                                    <ToggleButton value="10">10y</ToggleButton>
                                    <ToggleButton value="20">20y</ToggleButton>
                                    <ToggleButton value="custom">Custom</ToggleButton>
                                </ToggleButtonGroup>
                                {forecastPreset === 'custom' && (
                                    <TextField
                                        size="small"
                                        type="number"
                                        label="Years"
                                        value={customYearsInput}
                                        onChange={(e) => setCustomYearsInput(e.target.value)}
                                        onBlur={() => {
                                            setCustomYearsInput(String(forecastYears));
                                        }}
                                        inputProps={{
                                            min: MIN_FORECAST_YEARS,
                                            max: MAX_FORECAST_YEARS,
                                            step: 1,
                                        }}
                                        sx={{ width: 88 }}
                                    />
                                )}
                                {forecastLoading && <CircularProgress size={20} />}
                            </Box>
                        </Box>
                        {forecastError && (
                            <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setForecastError(null)}>
                                {forecastError}
                            </Alert>
                        )}
                        {!hasChart ? (
                            <Alert severity="info">
                                Save monthly snapshots for history. Add investment buckets with return assumptions to see a forecast.
                            </Alert>
                        ) : !chartsReady || (forecastLoading && !chartData.some((d) => d.expected != null)) ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height={360}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ width: '100%', height: 360, minHeight: 280, cursor: 'pointer' }}>
                                    <ResponsiveContainer width="100%" height={360} debounce={50}>
                                        <ComposedChart
                                            data={chartData}
                                            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                                            onClick={handleChartClick}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="month"
                                                tick={{ fontSize: 11 }}
                                                minTickGap={48}
                                                tickFormatter={(month) => formatChartMonthLabel(String(month))}
                                            />
                                            <YAxis tickFormatter={formatChartAxisThousands} width={72} />
                                            <Tooltip content={<NetWorthChartTooltip />} />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="optimistic"
                                                stroke="#90caf9"
                                                fill="#90caf9"
                                                fillOpacity={0.2}
                                                name="Forecast (optimistic)"
                                                connectNulls
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="pessimistic"
                                                stroke="#bbdefb"
                                                fill="#ffffff"
                                                fillOpacity={0}
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
                                            <Line
                                                type="monotone"
                                                dataKey="actual"
                                                stroke="#1565c0"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                name="Recorded (snapshots)"
                                                connectNulls
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                    Forecast ({forecastYears}y) assumes planned contributions and return scenarios
                                    {hasPayoffForecast ? ', including investing after debt payoff' : ''} — not guaranteed.
                                    Click a point to see how that month&apos;s net worth step is calculated.
                                </Typography>
                                <NetWorthStepModal
                                    open={stepBreakdown != null}
                                    breakdown={stepBreakdown}
                                    onClose={() => setStepBreakdown(null)}
                                />
                                {hasPayoffForecast && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        {payoffEvents.map((ev) => (
                                            <Typography key={ev.liabilityId} variant="body2">
                                                {ev.liabilityName} paid off by {formatChartMonthLabel(ev.payoffMonth)} →
                                                invest {formatCurrency(ev.monthlyRedirect)}/mo into {ev.targetAssetName}
                                            </Typography>
                                        ))}
                                    </Alert>
                                )}
                            </>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
                        <Typography variant="h6" gutterBottom>Asset allocation</Typography>
                        {pieData.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">Add assets to see breakdown</Typography>
                        ) : !chartsReady ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height={320}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', height: 320, minHeight: 260 }}>
                                <CategoryPieChart
                                    data={pieData}
                                    height={320}
                                    formatValue={formatCurrency}
                                    tooltipLabel="Value"
                                    emptyMessage="No assets"
                                />
                            </Box>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
                        <Typography variant="h6" gutterBottom>Recent value updates</Typography>
                        {recentUpdates.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">No updates yet</Typography>
                        ) : (
                            <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
                                {(Array.isArray(recentUpdates) ? recentUpdates : []).map((u) => (
                                    <ListItem key={u.id} disablePadding sx={{ py: 0.5 }}>
                                        <ListItemText
                                            primary={`${u.entityName} (${u.entityType})`}
                                            secondary={`${formatLocaleDate(u.asOfDate)} — ${formatCurrency(u.amount)}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
        </Box>
    );
};

export default UnifiedDashboard;
