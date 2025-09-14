import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    CircularProgress,
    Alert,
    Divider,
    LinearProgress,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    TrendingUp,
    AccountBalance,
    CreditCard,
    AttachMoney,
    Receipt,
    Upload,
    Flag,
    Assessment,
    Timeline,
    PlayArrow,
    Refresh,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { fetchAssets } from '../../store/slices/assetsSlice';
import { fetchAllDashboardData } from '../../store/slices/dashboardSlice';
import MonteCarloSimulation from '../../components/MonteCarloSimulation/MonteCarloSimulation';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Tooltip as RechartsTooltip,
    Line,
} from 'recharts';

const EnhancedDashboard: React.FC = () => {
    const dispatch = useAppDispatch();
    const [refreshing, setRefreshing] = useState(false);
    const [monteCarloOpen, setMonteCarloOpen] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState<{ id: string; name: string } | null>(null);

    // Redux state selectors
    const { assets, loading: assetsLoading, error: assetsError } = useAppSelector((state) => state.assets);
    const {
        summary,
        assetAllocation,
        expenseBreakdown,
        netWorthTrend,
        goalsProgress,
        loading: dashboardLoading,
        error: dashboardError
    } = useAppSelector((state) => state.dashboard);

    const loading = assetsLoading || dashboardLoading;
    const error = assetsError || dashboardError;

    const loadAllData = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchAssets()),
                dispatch(fetchAllDashboardData()),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleRefresh = () => {
        loadAllData();
    };

    const handleRunMonteCarlo = () => {
        // For now, use a default scenario. In a real app, this would open a scenario selector
        setSelectedScenario({ id: 'default', name: 'Current Financial Position' });
        setMonteCarloOpen(true);
    };

    const handleCloseMonteCarlo = () => {
        setMonteCarloOpen(false);
        setSelectedScenario(null);
    };

    // Calculate comprehensive financial summary
    const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.current_value.toString()), 0);
    const totalLiabilities = summary?.totalLiabilities || 0;
    const netWorth = totalAssets - totalLiabilities;
    const monthlyIncome = summary?.monthlyIncome || 0;
    const monthlyExpenses = summary?.monthlyExpenses || 0;
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    // Asset breakdown by type - use dashboard data if available, otherwise calculate from assets
    const assetBreakdownData = assetAllocation.length > 0
        ? assetAllocation.map(item => ({
            name: item.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: item.value,
        }))
        : Object.entries(assets.reduce((acc, asset) => {
            acc[asset.type] = (acc[asset.type] || 0) + parseFloat(asset.current_value.toString());
            return acc;
        }, {} as Record<string, number>)).map(([type, value]) => ({
            name: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value,
        }));

    // Use dashboard data if available, otherwise use calculated data
    const chartData = netWorthTrend.length > 0 ? netWorthTrend : [
        { month: 'Jan', netWorth: netWorth * 0.95, assets: totalAssets * 0.95, liabilities: totalLiabilities * 1.05 },
        { month: 'Feb', netWorth: netWorth * 0.98, assets: totalAssets * 0.98, liabilities: totalLiabilities * 1.02 },
        { month: 'Mar', netWorth: netWorth * 1.02, assets: totalAssets * 1.02, liabilities: totalLiabilities * 0.98 },
        { month: 'Apr', netWorth: netWorth * 0.99, assets: totalAssets * 0.99, liabilities: totalLiabilities * 1.01 },
        { month: 'May', netWorth: netWorth * 1.05, assets: totalAssets * 1.05, liabilities: totalLiabilities * 0.95 },
        { month: 'Jun', netWorth: netWorth, assets: totalAssets, liabilities: totalLiabilities },
    ];

    const expenseData = expenseBreakdown.length > 0 ? expenseBreakdown : [];

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

    if (loading && !refreshing) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    Financial Dashboard
                </Typography>
                <Box display="flex" gap={2}>
                    <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        onClick={handleRunMonteCarlo}
                        color="primary"
                    >
                        Run Monte Carlo
                    </Button>
                    <Tooltip title="Refresh all data">
                        <IconButton onClick={handleRefresh} disabled={refreshing}>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Financial Summary Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <AccountBalance color="primary" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Total Assets
                                    </Typography>
                                    <Typography variant="h5">
                                        ${totalAssets.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {assets.length} accounts
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <CreditCard color="error" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Total Liabilities
                                    </Typography>
                                    <Typography variant="h5">
                                        ${totalLiabilities.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary?.liabilityCount || 0} debts
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <TrendingUp color={netWorth >= 0 ? "success" : "error"} sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Net Worth
                                    </Typography>
                                    <Typography variant="h5">
                                        ${netWorth.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {netWorth >= 0 ? "Positive" : "Negative"}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <AttachMoney color={monthlySavings >= 0 ? "success" : "error"} sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Savings
                                    </Typography>
                                    <Typography variant="h5">
                                        ${monthlySavings.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {savingsRate.toFixed(1)}% savings rate
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Income vs Expenses */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <TrendingUp color="success" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Income
                                    </Typography>
                                    <Typography variant="h5">
                                        ${monthlyIncome.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary?.incomeStreamCount || 0} streams
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Receipt color="warning" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Expenses
                                    </Typography>
                                    <Typography variant="h5">
                                        ${monthlyExpenses.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary?.expenseCount || 0} categories
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Goals Progress */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Flag color="info" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Goals Progress
                                    </Typography>
                                    <Typography variant="h5">
                                        {summary?.activeGoalsCount || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary?.achievedGoalsCount || 0} achieved
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Scenarios */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Assessment color="secondary" sx={{ mr: 2 }} />
                                <Box flex={1}>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Active Scenarios
                                    </Typography>
                                    <Typography variant="h5">
                                        {summary?.activeScenariosCount || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {summary?.totalScenariosCount || 0} total
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Net Worth Trend Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Net Worth Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']} />
                                <Legend />
                                <Area type="monotone" dataKey="assets" stackId="1" stroke="#4caf50" fill="#4caf50" fillOpacity={0.6} name="Assets" />
                                <Area type="monotone" dataKey="liabilities" stackId="1" stroke="#f44336" fill="#f44336" fillOpacity={0.4} name="Liabilities" />
                                <Line type="monotone" dataKey="netWorth" stroke="#1976d2" strokeWidth={3} name="Net Worth" dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Asset Allocation */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Asset Allocation
                        </Typography>
                        {assetBreakdownData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={assetBreakdownData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {assetBreakdownData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={350}>
                                <Typography color="text.secondary" gutterBottom>
                                    No assets data available
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    {assets.length === 0
                                        ? "Add some assets to see your allocation breakdown"
                                        : "Asset allocation data is being calculated..."
                                    }
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Expense Breakdown */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Monthly Expenses by Category
                        </Typography>
                        {expenseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={expenseData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Monthly Amount']} />
                                    <Bar dataKey="amount" fill="#ff9800" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                                <Typography color="text.secondary">No expenses data available</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Goals Progress */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Financial Goals Progress
                        </Typography>
                        {goalsProgress.length > 0 ? (
                            <Box>
                                {goalsProgress.slice(0, 3).map((goal) => (
                                    <Box key={goal.id} mb={2}>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography variant="body2">{goal.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ${goal.currentProgress.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={goal.progressPercentage}
                                            sx={{ height: 8, borderRadius: 4 }}
                                        />
                                    </Box>
                                ))}
                                {goalsProgress.length > 3 && (
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        +{goalsProgress.length - 3} more goals
                                    </Typography>
                                )}
                            </Box>
                        ) : (
                            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
                                <Typography color="text.secondary">No active goals set</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Recent Assets
                        </Typography>
                        {assets.length > 0 ? (
                            <List>
                                {assets.slice(0, 5).map((asset, index) => (
                                    <React.Fragment key={asset.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                <AccountBalance />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={asset.name}
                                                secondary={`$${parseFloat(asset.current_value.toString()).toLocaleString()} • ${asset.type.replace('_', ' ')}`}
                                            />
                                            {asset.annual_return_rate && (
                                                <Chip
                                                    label={`${(asset.annual_return_rate * 100).toFixed(1)}%`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            )}
                                        </ListItem>
                                        {index < Math.min(assets.length, 5) - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Typography color="text.secondary">No assets added yet</Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Quick Actions
                        </Typography>
                        <List>
                            <ListItem button onClick={handleRunMonteCarlo}>
                                <ListItemIcon>
                                    <PlayArrow />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Run Monte Carlo Simulation"
                                    secondary="Analyze probability distributions"
                                />
                            </ListItem>
                            <ListItem button>
                                <ListItemIcon>
                                    <Timeline />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Create New Scenario"
                                    secondary="Model different financial outcomes"
                                />
                            </ListItem>
                            <ListItem button>
                                <ListItemIcon>
                                    <Upload />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Import Data"
                                    secondary="Upload CSV or Excel files"
                                />
                            </ListItem>
                            <ListItem button>
                                <ListItemIcon>
                                    <Flag />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Set Financial Goals"
                                    secondary="Define your financial targets"
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Monte Carlo Simulation Dialog */}
            <Dialog
                open={monteCarloOpen}
                onClose={handleCloseMonteCarlo}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>
                    Monte Carlo Simulation
                    {selectedScenario && (
                        <Typography variant="body2" color="text.secondary" component="span">
                            Scenario: {selectedScenario.name}
                        </Typography>
                    )}
                </DialogTitle>
                <DialogContent>
                    {selectedScenario && (
                        <MonteCarloSimulation
                            scenarioId={selectedScenario.id}
                            scenarioName={selectedScenario.name}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMonteCarlo}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EnhancedDashboard;
