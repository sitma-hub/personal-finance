import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Paper,
    Alert,
    Chip,
    LinearProgress,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Avatar,
    Badge,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    AttachMoney as MoneyIcon,
    CreditCard as DebtIcon,
    Savings as SavingsIcon,
    Assessment as AssessmentIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon,
    Lightbulb as LightbulbIcon,
    Refresh as RefreshIcon,
    Flag as FlagIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
} from 'recharts';
import { useFinancial } from '../../contexts/FinancialContext';
import EnhancedMonteCarloSimulation from '../../components/EnhancedMonteCarloSimulation/EnhancedMonteCarloSimulation';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const UnifiedDashboard: React.FC = () => {
    const { state, actions } = useFinancial();
    const [showSimulation, setShowSimulation] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1y' | '5y' | '10y'>('5y');

    const formatCurrency = (amount: number): string => {
        // Debug logging
        if (isNaN(amount)) {
            console.warn('formatCurrency received NaN:', amount);
            return '$0';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatPercentage = (value: number): string => {
        // Debug logging
        if (isNaN(value)) {
            console.warn('formatPercentage received NaN:', value);
            return '0.0%';
        }

        return `${(value || 0).toFixed(1)}%`;
    };

    // Get projections for selected timeframe
    const timeframeYears = selectedTimeframe === '1y' ? 1 : selectedTimeframe === '5y' ? 5 : 10;
    const relevantProjections = state.projections.filter(p => p.year <= timeframeYears);

    // Prepare chart data
    const netWorthChartData = relevantProjections
        .filter((_, index) => index % (selectedTimeframe === '10y' ? 6 : 3) === 0) // Sample data points
        .map(projection => ({
            date: `${projection.year}-${projection.month.toString().padStart(2, '0')}`,
            netWorth: projection.snapshot.netWorth,
            assets: projection.snapshot.totalAssets,
            liabilities: projection.snapshot.totalLiabilities,
        }));

    // Asset allocation data
    const assetAllocationData = [
        { name: 'Savings', value: state.assets.filter(a => a.type === 'savings_account').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Checking', value: state.assets.filter(a => a.type === 'checking_account').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Investments', value: state.assets.filter(a => a.type === 'investment_account').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Retirement', value: state.assets.filter(a => a.type === 'retirement_account').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Real Estate', value: state.assets.filter(a => a.type === 'real_estate').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Vehicles', value: state.assets.filter(a => a.type === 'vehicle').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
        { name: 'Other', value: state.assets.filter(a => a.type === 'other_asset').reduce((sum, a) => sum + parseFloat(a.current_value.toString()), 0) },
    ].filter(item => item.value > 0);

    // Income vs Expenses data
    const cashFlowData = [
        { name: 'Income', value: state.currentSnapshot.monthlyIncome, color: '#4caf50' },
        { name: 'Expenses', value: state.currentSnapshot.monthlyExpenses, color: '#f44336' },
        { name: 'Savings', value: state.currentSnapshot.monthlySavings, color: '#2196f3' },
    ];

    // Goal progress data
    const goalProgressData = state.goals.map(goal => ({
        name: goal.name,
        progress: (goal.current_progress / goal.target_amount) * 100,
        target: goal.target_amount,
        current: goal.current_progress,
        priority: goal.priority,
        daysLeft: Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }));

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'warning': return <WarningIcon color="warning" />;
            case 'achievement': return <CheckCircleIcon color="success" />;
            case 'opportunity': return <LightbulbIcon color="info" />;
            case 'recommendation': return <InfoIcon color="primary" />;
            default: return <InfoIcon />;
        }
    };

    const getInsightColor = (type: string) => {
        switch (type) {
            case 'warning': return 'warning';
            case 'achievement': return 'success';
            case 'opportunity': return 'info';
            case 'recommendation': return 'primary';
            default: return 'default';
        }
    };

    if (state.loading && state.assets.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <Box textAlign="center">
                    <RefreshIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6">Loading your financial data...</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Financial Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Complete overview of your financial health with intelligent insights and projections
                    </Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={actions.refreshData}
                        disabled={state.loading}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AssessmentIcon />}
                        onClick={() => {
                            console.log('🎯 Dashboard "Run Simulation" button clicked - opening simulation panel');
                            setShowSimulation(true);
                        }}
                    >
                        Run Simulation
                    </Button>
                </Box>
            </Box>

            {state.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {state.error}
                </Alert>
            )}

            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                    <MoneyIcon />
                                </Avatar>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Net Worth
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(state.currentSnapshot.netWorth)}
                                    </Typography>
                                    <Box display="flex" alignItems="center" mt={1}>
                                        {state.currentSnapshot.netWorth >= 0 ? (
                                            <TrendingUpIcon color="success" fontSize="small" />
                                        ) : (
                                            <TrendingDownIcon color="error" fontSize="small" />
                                        )}
                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                            {state.lastUpdated ? `Updated ${state.lastUpdated.toLocaleDateString()}` : 'Not updated'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                                    <SavingsIcon />
                                </Avatar>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Savings
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(state.currentSnapshot.monthlySavings)}
                                    </Typography>
                                    <Box display="flex" alignItems="center" mt={1}>
                                        <Typography variant="body2" color="text.secondary">
                                            Savings Rate: {formatPercentage(state.currentSnapshot.savingsRate)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                                    <SecurityIcon />
                                </Avatar>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Emergency Fund
                                    </Typography>
                                    <Typography variant="h5">
                                        {state.currentSnapshot.emergencyFundMonths.toFixed(1)} months
                                    </Typography>
                                    <Box display="flex" alignItems="center" mt={1}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min((state.currentSnapshot.emergencyFundMonths / 6) * 100, 100)}
                                            sx={{ flexGrow: 1, height: 4, borderRadius: 2 }}
                                            color={state.currentSnapshot.emergencyFundMonths >= 6 ? 'success' :
                                                state.currentSnapshot.emergencyFundMonths >= 3 ? 'warning' : 'error'}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <Avatar sx={{ bgcolor: state.currentSnapshot.debtToIncomeRatio > 40 ? 'error.main' : 'warning.main', mr: 2 }}>
                                    <DebtIcon />
                                </Avatar>
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Debt-to-Income
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatPercentage(state.currentSnapshot.debtToIncomeRatio)}
                                    </Typography>
                                    <Box display="flex" alignItems="center" mt={1}>
                                        <Chip
                                            label={state.currentSnapshot.debtToIncomeRatio <= 20 ? 'Excellent' :
                                                state.currentSnapshot.debtToIncomeRatio <= 40 ? 'Good' : 'High'}
                                            size="small"
                                            color={state.currentSnapshot.debtToIncomeRatio <= 20 ? 'success' :
                                                state.currentSnapshot.debtToIncomeRatio <= 40 ? 'warning' : 'error'}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Financial Insights */}
            {state.insights.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom component="div">
                        <Badge badgeContent={state.insights.length} color="primary">
                            Financial Insights
                        </Badge>
                    </Typography>

                    <Grid container spacing={2}>
                        {state.insights.slice(0, 6).map((insight, index) => (
                            <Grid item xs={12} md={6} key={index}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box display="flex" alignItems="flex-start">
                                            <Box sx={{ mr: 2 }}>
                                                {getInsightIcon(insight.type)}
                                            </Box>
                                            <Box flexGrow={1}>
                                                <Box display="flex" alignItems="center" mb={1}>
                                                    <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                                                        {insight.title}
                                                    </Typography>
                                                    <Chip
                                                        label={insight.impact}
                                                        size="small"
                                                        color={getInsightColor(insight.type) as any}
                                                        variant="outlined"
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="text.secondary" paragraph>
                                                    {insight.description}
                                                </Typography>
                                                {insight.actionItems.length > 0 && (
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Recommended Actions:
                                                        </Typography>
                                                        <List dense sx={{ py: 0 }}>
                                                            {insight.actionItems.slice(0, 2).map((action, actionIndex) => (
                                                                <ListItem key={actionIndex} sx={{ py: 0.5, px: 0 }}>
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        • {action}
                                                                    </Typography>
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Charts and Projections */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Net Worth Projection */}
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" component="div">
                                Net Worth Projection
                            </Typography>
                            <Box>
                                {(['1y', '5y', '10y'] as const).map(timeframe => (
                                    <Button
                                        key={timeframe}
                                        size="small"
                                        variant={selectedTimeframe === timeframe ? 'contained' : 'outlined'}
                                        onClick={() => setSelectedTimeframe(timeframe)}
                                        sx={{ ml: 1 }}
                                    >
                                        {timeframe}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={netWorthChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="assets"
                                    stackId="1"
                                    stroke="#4caf50"
                                    fill="#4caf50"
                                    fillOpacity={0.6}
                                    name="Assets"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="liabilities"
                                    stackId="2"
                                    stroke="#f44336"
                                    fill="#f44336"
                                    fillOpacity={0.6}
                                    name="Liabilities"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="netWorth"
                                    stroke="#2196f3"
                                    strokeWidth={3}
                                    name="Net Worth"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Asset Allocation */}
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Asset Allocation
                        </Typography>

                        {assetAllocationData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={assetAllocationData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {assetAllocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={300}>
                                <Typography color="text.secondary" gutterBottom>
                                    No assets data available
                                </Typography>
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    {state.assets.length === 0
                                        ? "Add some assets to see your allocation breakdown"
                                        : "Asset allocation data is being calculated..."
                                    }
                                </Typography>
                                {state.loading && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Loading...
                                    </Typography>
                                )}
                                {state.error && (
                                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                        Error: {state.error}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Cash Flow */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Monthly Cash Flow
                        </Typography>

                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={cashFlowData} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                <YAxis dataKey="name" type="category" />
                                <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']} />
                                <Bar dataKey="value">
                                    {cashFlowData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Goal Progress */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom component="div">
                            Goal Progress
                        </Typography>

                        <List>
                            {goalProgressData.slice(0, 4).map((goal, index) => (
                                <React.Fragment key={index}>
                                    <ListItem>
                                        <ListItemIcon>
                                            <FlagIcon color={goal.priority <= 2 ? 'error' : goal.priority <= 3 ? 'warning' : 'primary'} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={goal.name}
                                            secondary={
                                                <span>
                                                    <span style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={Math.min(goal.progress, 100)}
                                                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                                                            color={goal.progress >= 75 ? 'success' : goal.progress >= 50 ? 'warning' : 'primary'}
                                                        />
                                                        <Typography variant="body2" sx={{ ml: 1, minWidth: 40 }} component="span">
                                                            {goal.progress.toFixed(0)}%
                                                        </Typography>
                                                    </span>
                                                    <Typography variant="caption" color="text.secondary" component="span" style={{ display: 'block', marginTop: 4 }}>
                                                        {formatCurrency(goal.current)} of {formatCurrency(goal.target)}
                                                        {goal.daysLeft > 0 && ` • ${goal.daysLeft} days left`}
                                                    </Typography>
                                                </span>
                                            }
                                        />
                                    </ListItem>
                                    {index < goalProgressData.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Enhanced Simulation Modal */}
            {showSimulation && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h5">
                            Monte Carlo Simulation
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => setShowSimulation(false)}
                        >
                            Close
                        </Button>
                    </Box>
                    <EnhancedMonteCarloSimulation />
                </Paper>
            )}

            {/* Quick Stats Footer */}
            <Paper sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                            Total Assets: {formatCurrency(state.currentSnapshot.totalAssets)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                            Total Liabilities: {formatCurrency(state.currentSnapshot.totalLiabilities)}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary">
                            Active Goals: {state.goals.filter(g => !g.is_achieved).length}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary" textAlign="right">
                            Last Updated: {state.lastUpdated?.toLocaleString() || 'Never'}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default UnifiedDashboard;
