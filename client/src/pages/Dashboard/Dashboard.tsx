import React, { useEffect } from 'react';
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
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    AccountBalance,
    CreditCard,
    AttachMoney,
    Receipt,
    Upload,
    Flag,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, useAppDispatch, useAppSelector } from '../../store/store';
import { fetchAssets } from '../../store/slices/assetsSlice';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
    const dispatch = useAppDispatch();
    const { assets, loading, error } = useAppSelector((state) => state.assets);

    useEffect(() => {
        dispatch(fetchAssets());
    }, [dispatch]);

    // Calculate summary data
    const totalAssets = assets.reduce((sum, asset) => sum + asset.current_value, 0);
    const assetsByType = assets.reduce((acc, asset) => {
        acc[asset.type] = (acc[asset.type] || 0) + asset.current_value;
        return acc;
    }, {} as Record<string, number>);

    // Sample data for charts
    const netWorthData = [
        { month: 'Jan', value: 100000 },
        { month: 'Feb', value: 105000 },
        { month: 'Mar', value: 110000 },
        { month: 'Apr', value: 108000 },
        { month: 'May', value: 115000 },
        { month: 'Jun', value: 120000 },
    ];

    const assetBreakdownData = Object.entries(assetsByType).map(([type, value]) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value,
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    if (loading) {
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
            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <AccountBalance color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Total Assets
                                    </Typography>
                                    <Typography variant="h5">
                                        ${totalAssets.toLocaleString()}
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
                                <TrendingUp color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Net Worth
                                    </Typography>
                                    <Typography variant="h5">
                                        ${(totalAssets * 0.8).toLocaleString()}
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
                                <AttachMoney color="info" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Income
                                    </Typography>
                                    <Typography variant="h5">
                                        $5,000
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
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Monthly Expenses
                                    </Typography>
                                    <Typography variant="h5">
                                        $3,200
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Net Worth Trend
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={netWorthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Net Worth']} />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Asset Breakdown
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={assetBreakdownData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {assetBreakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Recent Assets */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Assets
                        </Typography>
                        <List>
                            {assets.slice(0, 5).map((asset) => (
                                <ListItem key={asset.id} divider>
                                    <ListItemIcon>
                                        <AccountBalance />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={asset.name}
                                        secondary={`$${asset.current_value.toLocaleString()} • ${asset.type.replace('_', ' ')}`}
                                    />
                                    <Chip
                                        label={`${(asset.annual_return_rate || 0) * 100}%`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Quick Actions */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Quick Actions
                        </Typography>
                        <List>
                            <ListItem button>
                                <ListItemIcon>
                                    <TrendingUp />
                                </ListItemIcon>
                                <ListItemText primary="Run New Scenario" secondary="Model different financial outcomes" />
                            </ListItem>
                            <ListItem button>
                                <ListItemIcon>
                                    <Upload />
                                </ListItemIcon>
                                <ListItemText primary="Import Data" secondary="Upload CSV or Excel files" />
                            </ListItem>
                            <ListItem button>
                                <ListItemIcon>
                                    <Flag />
                                </ListItemIcon>
                                <ListItemText primary="Set Financial Goals" secondary="Define your financial targets" />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
