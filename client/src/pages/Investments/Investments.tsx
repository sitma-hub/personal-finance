import React, { useEffect, useState } from 'react';
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
} from 'recharts';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link } from '@mui/material';
import { useFinancial } from '../../contexts/FinancialContext';
import { projectionService } from '../../services/projectionService';
import { InvestmentProjectionsResponse } from '../../types';
import { formatChartAxisThousands, formatCurrency } from '../../utils/currency';

const formatPct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

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

    const chartData = (data?.totalsSeries || []).map((p) => ({
        month: p.month,
        pessimistic: p.pessimistic,
        optimistic: p.optimistic,
        expected: p.expected,
    }));

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
                Set monthly contribution and return scenarios here — not under Expenses.
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
                            <Typography variant="h6">Forecast — total investable value</Typography>
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
                        {chartData.length === 0 ? (
                            <Alert severity="warning">
                                No buckets in forecast. Add an investment account with expected return and enable &quot;Include in forecast&quot;.
                            </Alert>
                        ) : (
                            <Box sx={{ width: '100%', height: { xs: 300, lg: 400 } }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis tickFormatter={formatChartAxisThousands} width={72} />
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        <Legend />
                                        <Area
                                            type="monotone"
                                            dataKey="optimistic"
                                            stroke="#64b5f6"
                                            fill="#64b5f6"
                                            fillOpacity={0.15}
                                            name="Optimistic"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="pessimistic"
                                            stroke="#90caf9"
                                            fill="#90caf9"
                                            fillOpacity={0.08}
                                            name="Pessimistic"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="expected"
                                            stroke="#1976d2"
                                            strokeWidth={2}
                                            dot={false}
                                            name="Expected"
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                            Scenarios are illustrative only — not guaranteed returns.
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
