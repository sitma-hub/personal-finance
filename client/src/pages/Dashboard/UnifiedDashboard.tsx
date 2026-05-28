import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
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
    useMediaQuery,
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
import { Link as RouterLink } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
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
import { CashFlowSankeyChart } from '../../components/charts/CashFlowSankeyChart';
import { ForecastRangeChart } from '../../components/charts/ForecastRangeChart';
import { NetWorthStepModal } from '../../components/dashboard/NetWorthStepModal';
import { projectionService } from '../../services/projectionService';
import { formatCurrency } from '../../utils/currency';
import {
    buildNetWorthStepBreakdown,
    resolveClickedScenario,
    type NetWorthChartRow,
    type NetWorthStepBreakdown,
} from '../../utils/netWorthStepBreakdown';
import { buildCashFlowSankeyData } from '../../utils/cashFlowSankey';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { getChartSeriesColors } from '../../theme/tokens';

const MIN_FORECAST_YEARS = 1;
const MAX_FORECAST_YEARS = 40;

type ForecastPreset = '5' | '10' | '20' | 'custom';

const clampForecastYears = (years: number): number =>
    Math.min(MAX_FORECAST_YEARS, Math.max(MIN_FORECAST_YEARS, years));

const currentMonthLabel = (): string => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const UnifiedDashboard: React.FC = () => {
    const muiTheme = useTheme();
    const smDown = useMediaQuery(muiTheme.breakpoints.down('sm'));
    const mdDown = useMediaQuery(muiTheme.breakpoints.down('md'));
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
        incomeStreams,
        expenses,
        liabilities,
        assets,
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

    const handleChartClick = (row: NetWorthChartRow, scenarioKey: string) => {
        const scenario = resolveClickedScenario(scenarioKey, row);
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
    const netWorthChartHeight = smDown ? 280 : mdDown ? 340 : 360;
    const pieChartHeight = smDown ? 260 : 320;

    const cashFlowSankeyData = useMemo(
        () => buildCashFlowSankeyData(incomeStreams, expenses, liabilities, assets),
        [incomeStreams, expenses, liabilities, assets]
    );

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

    const seriesColors = getChartSeriesColors(muiTheme);
    const pieData = allocation.map((a, i) => ({
        name: a.type.replace(/_/g, ' '),
        value: a.value,
        color: seriesColors[i % seriesColors.length],
    }));

    const hasChart = chartData.some((d) => d.actual != null)
        || chartData.some((d) => d.expected != null);

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <PageHeader
                title="Dashboard"
                actions={
                    <>
                        <Button startIcon={<RefreshIcon />} onClick={() => refresh()}>
                            Refresh
                        </Button>
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
                    </>
                }
            />

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
                        <StatCard
                            icon={<MoneyIcon color="primary" />}
                            label="Net worth"
                            value={formatCurrency(summary.netWorth)}
                            sx={{ height: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <StatCard
                            icon={<TrendingUpIcon color="success" />}
                            label="Assets"
                            value={formatCurrency(summary.totalAssets)}
                            sx={{ height: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <StatCard
                            icon={<DebtIcon color="error" />}
                            label="Liabilities"
                            value={formatCurrency(summary.totalLiabilities)}
                            sx={{ height: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <StatCard
                            icon={<SavingsIcon color={summary.monthlySavings >= 0 ? 'success' : 'error'} />}
                            label="Monthly cash flow"
                            value={formatCurrency(summary.monthlySavings)}
                            sx={{ height: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} lg={2.4}>
                        <StatCard
                            icon={<ShowChartIcon color="info" />}
                            label={
                                <Link component={RouterLink} to="/investments" underline="hover">
                                    Planned investing
                                </Link>
                            }
                            value={`${formatCurrency(plannedInvesting)}/mo`}
                            sx={{ height: '100%' }}
                        />
                    </Grid>
                </Grid>
            )}

            <Grid container spacing={3} sx={{ width: '100%', mb: 3 }}>
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 2, width: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Where your money goes
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Each income stream, expense category, and loan payment is shown separately.
                            Edit data on{' '}
                            <Link component={RouterLink} to="/income" underline="hover">
                                Income
                            </Link>
                            {' '}and{' '}
                            <Link component={RouterLink} to="/expenses" underline="hover">
                                Expenses
                            </Link>
                            .
                        </Typography>
                        <CashFlowSankeyChart
                            data={cashFlowSankeyData}
                            loading={loading}
                            ready={chartsReady}
                        />
                    </GlassSurface>
                </Grid>
            </Grid>

            <Grid container spacing={3} sx={{ width: '100%' }}>
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 2, width: '100%' }}>
                        <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            flexWrap="wrap"
                            gap={1}
                            mb={1}
                        >
                            <Typography variant="h6">Net worth over time</Typography>
                            <Box
                                display="flex"
                                alignItems="center"
                                gap={1}
                                flexWrap="wrap"
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                <ToggleButtonGroup
                                    size="small"
                                    exclusive
                                    value={forecastPreset}
                                    onChange={(_, value: ForecastPreset | null) => {
                                        if (value) setForecastPreset(value);
                                    }}
                                    aria-label="Forecast horizon"
                                    sx={{
                                        width: { xs: '100%', sm: 'auto' },
                                        '& .MuiToggleButton-root': { flex: { xs: 1, sm: 'initial' } },
                                    }}
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
                                        sx={{ width: { xs: '100%', sm: 88 } }}
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
                            <Box display="flex" justifyContent="center" alignItems="center" height={netWorthChartHeight}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <>
                                <Box sx={{ width: '100%', height: netWorthChartHeight, minHeight: 260, cursor: 'pointer' }}>
                                    <ForecastRangeChart
                                        data={chartData}
                                        height={netWorthChartHeight}
                                        onPointClick={handleChartClick}
                                        showAssetLiabilityFooter
                                    />
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
                    </GlassSurface>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <GlassSurface sx={{ p: 2, height: '100%', width: '100%' }}>
                        <Typography variant="h6" gutterBottom>Asset allocation</Typography>
                        {pieData.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">Add assets to see breakdown</Typography>
                        ) : !chartsReady ? (
                            <Box display="flex" justifyContent="center" alignItems="center" height={pieChartHeight}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <Box sx={{ width: '100%', height: pieChartHeight, minHeight: 240 }}>
                                <CategoryPieChart
                                    data={pieData}
                                    height={pieChartHeight}
                                    formatValue={formatCurrency}
                                    tooltipLabel="Value"
                                    emptyMessage="No assets"
                                />
                            </Box>
                        )}
                    </GlassSurface>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <GlassSurface sx={{ p: 2, height: '100%', width: '100%' }}>
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
                    </GlassSurface>
                </Grid>
            </Grid>

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
        </Box>
    );
};

export default UnifiedDashboard;
