import React, { useMemo, useState } from 'react';
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
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    AttachMoney as MoneyIcon,
    CreditCard as DebtIcon,
    Savings as SavingsIcon,
    CameraAlt as SnapshotIcon,
    Refresh as RefreshIcon,
    ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    ComposedChart,
    Area,
} from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import type { TooltipProps } from 'recharts';
import { useFinancial } from '../../contexts/FinancialContext';
import { formatChartMonthLabel } from '../../utils/dateInput';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);

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

    const chartData = useMemo(() => {
        const historical = netWorthHistory.map((h) => ({
            month: h.month,
            actual: h.netWorth,
            expected: null as number | null,
            pessimistic: null as number | null,
            optimistic: null as number | null,
        }));
        const forecast = (netWorthProjections?.series || []).map((p) => ({
            month: p.month,
            actual: null as number | null,
            expected: p.netWorthExpected,
            pessimistic: p.netWorthPessimistic,
            optimistic: p.netWorthOptimistic,
            assetsExpected: p.assetsExpected,
            liabilities: p.liabilities,
        }));
        return [...historical, ...forecast];
    }, [netWorthHistory, netWorthProjections]);

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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    const pieData = allocation.map((a) => ({
        name: a.type.replace(/_/g, ' '),
        value: a.value,
    }));

    const hasChart = chartData.some((d) => d.actual != null) || chartData.some((d) => d.expected != null);

    return (
        <Box sx={{ width: '100%', maxWidth: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4">Dashboard</Typography>
                <Box display="flex" gap={1}>
                    <Button startIcon={<RefreshIcon />} onClick={() => refresh()}>Refresh</Button>
                    <Button
                        variant="contained"
                        startIcon={<SnapshotIcon />}
                        onClick={handleSaveSnapshot}
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : `Save ${currentMonthLabel()}`}
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                        <Typography variant="h6" gutterBottom>Net worth over time</Typography>
                        {!hasChart ? (
                            <Alert severity="info">
                                Save monthly snapshots for history. Add investment buckets with return assumptions to see a forecast.
                            </Alert>
                        ) : (
                            <>
                                <Box sx={{ width: '100%', height: { xs: 280, sm: 360, lg: 420 } }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={72} />
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
                                    Forecast assumes planned contributions and return scenarios — not guaranteed.
                                </Typography>
                            </>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 2, height: '100%', width: '100%' }}>
                        <Typography variant="h6" gutterBottom>Asset allocation</Typography>
                        {pieData.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">Add assets to see breakdown</Typography>
                        ) : (
                            <Box sx={{ width: '100%', height: { xs: 260, lg: 320 } }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={110} label>
                                            {pieData.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
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
                            <List dense sx={{ maxHeight: { xs: 260, lg: 320 }, overflow: 'auto' }}>
                                {recentUpdates.map((u) => (
                                    <ListItem key={u.id} disablePadding sx={{ py: 0.5 }}>
                                        <ListItemText
                                            primary={`${u.entityName} (${u.entityType})`}
                                            secondary={`${u.asOfDate?.toString().substring(0, 10)} — ${formatCurrency(u.amount)}`}
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
