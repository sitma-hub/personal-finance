import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingDown as TrendingDownIcon,
    ShoppingCart as ShoppingCartIcon,
    Home as HomeIcon,
    DirectionsCar as CarIcon,
    Restaurant as RestaurantIcon,
    HealthAndSafety as HealthIcon,
    School as SchoolIcon,
    SportsEsports as EntertainmentIcon,
    AttachMoney as MoneyIcon,
    Category as CategoryIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Expense, ExpenseFormData } from '../../types';
import { expenseService } from '../../services/expenseService';

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState<ExpenseFormData>({
        name: '',
        category: '',
        monthly_amount: 0,
        annual_inflation_rate: 0,
        is_discretionary: false,
        notes: '',
    });

    const expenseCategories = [
        'Housing',
        'Transportation',
        'Food & Dining',
        'Healthcare',
        'Education',
        'Entertainment',
        'Utilities',
        'Insurance',
        'Personal Care',
        'Shopping',
        'Travel',
        'Other',
    ];

    const categoryIcons: Record<string, React.ReactElement> = {
        'Housing': <HomeIcon />,
        'Transportation': <CarIcon />,
        'Food & Dining': <RestaurantIcon />,
        'Healthcare': <HealthIcon />,
        'Education': <SchoolIcon />,
        'Entertainment': <EntertainmentIcon />,
        'Utilities': <MoneyIcon />,
        'Insurance': <HealthIcon />,
        'Personal Care': <ShoppingCartIcon />,
        'Shopping': <ShoppingCartIcon />,
        'Travel': <CarIcon />,
        'Other': <CategoryIcon />,
    };

    const categoryColors: Record<string, string> = {
        'Housing': '#FF6B6B',
        'Transportation': '#4ECDC4',
        'Food & Dining': '#45B7D1',
        'Healthcare': '#96CEB4',
        'Education': '#FFEAA7',
        'Entertainment': '#DDA0DD',
        'Utilities': '#98D8C8',
        'Insurance': '#F7DC6F',
        'Personal Care': '#BB8FCE',
        'Shopping': '#85C1E9',
        'Travel': '#F8C471',
        'Other': '#82C0CC',
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const response = await expenseService.getAllExpenses();
            if (response.success && response.data) {
                setExpenses(response.data);
            } else {
                setError('Failed to fetch expenses');
            }
        } catch (err) {
            setError('Failed to fetch expenses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Please enter an expense name');
            return;
        }
        if (!formData.category.trim()) {
            setError('Please select a category');
            return;
        }

        setLoading(true);
        try {
            let response;
            if (editingExpense) {
                response = await expenseService.updateExpense(editingExpense.id, formData);
            } else {
                response = await expenseService.createExpense(formData);
            }

            if (response.success) {
                await fetchExpenses();
                handleCloseDialog();
            } else {
                setError(response.error?.message || 'Failed to save expense');
            }
        } catch (err) {
            setError('Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            name: expense.name,
            category: expense.category,
            monthly_amount: expense.monthly_amount,
            annual_inflation_rate: expense.annual_inflation_rate,
            is_discretionary: expense.is_discretionary,
            notes: expense.notes || '',
        });
        setOpenDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        setLoading(true);
        try {
            const response = await expenseService.deleteExpense(id);
            if (response.success) {
                await fetchExpenses();
            } else {
                setError(response.error?.message || 'Failed to delete expense');
            }
        } catch (err) {
            setError('Failed to delete expense');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingExpense(null);
        setFormData({
            name: '',
            category: '',
            monthly_amount: 0,
            annual_inflation_rate: 0,
            is_discretionary: false,
            notes: '',
        });
        setError(null);
    };

    // Calculate totals
    const totalMonthlyExpenses = expenses.reduce((sum, expense) => sum + Number(expense.monthly_amount), 0);
    const totalAnnualExpenses = totalMonthlyExpenses * 12;
    const discretionaryExpenses = expenses.filter(e => e.is_discretionary).reduce((sum, expense) => sum + Number(expense.monthly_amount), 0);
    const essentialExpenses = totalMonthlyExpenses - discretionaryExpenses;

    // Chart data
    const categoryData = Object.entries(
        expenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + Number(expense.monthly_amount);
            return acc;
        }, {} as Record<string, number>)
    ).map(([category, amount]) => ({
        name: category,
        value: amount,
        color: categoryColors[category] || '#8884d8',
    }));

    const discretionaryData = [
        { name: 'Essential', value: essentialExpenses, color: '#4caf50' },
        { name: 'Discretionary', value: discretionaryExpenses, color: '#ff9800' },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" gutterBottom>
                    Expenses
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add Expense
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                                <Typography variant="h6">Monthly Expenses</Typography>
                            </Box>
                            <Typography variant="h4" color="error.main">
                                ${totalMonthlyExpenses.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <MoneyIcon color="warning" sx={{ mr: 1 }} />
                                <Typography variant="h6">Annual Expenses</Typography>
                            </Box>
                            <Typography variant="h4" color="warning.main">
                                ${totalAnnualExpenses.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <ShoppingCartIcon color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Essential</Typography>
                            </Box>
                            <Typography variant="h4" color="success.main">
                                ${essentialExpenses.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <EntertainmentIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">Discretionary</Typography>
                            </Box>
                            <Typography variant="h4" color="info.main">
                                ${discretionaryExpenses.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Expenses by Category
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Monthly Amount']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Essential vs Discretionary
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={discretionaryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {discretionaryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Monthly Amount']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Expenses Table */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            All Expenses
                        </Typography>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Category</TableCell>
                                            <TableCell align="right">Monthly Amount</TableCell>
                                            <TableCell align="right">Annual Inflation</TableCell>
                                            <TableCell align="center">Type</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {expenses.map((expense) => (
                                            <TableRow key={expense.id}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center">
                                                        {categoryIcons[expense.category]}
                                                        <Typography sx={{ ml: 1 }}>
                                                            {expense.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={expense.category}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ backgroundColor: categoryColors[expense.category] + '20' }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    ${expense.monthly_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {expense.annual_inflation_rate}%
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={expense.is_discretionary ? 'Discretionary' : 'Essential'}
                                                        size="small"
                                                        color={expense.is_discretionary ? 'warning' : 'success'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        onClick={() => handleEdit(expense)}
                                                        size="small"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => handleDelete(expense.id)}
                                                        size="small"
                                                        color="error"
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Expense Name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    label="Category"
                                >
                                    {expenseCategories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            <Box display="flex" alignItems="center">
                                                {categoryIcons[category]}
                                                <Typography sx={{ ml: 1 }}>
                                                    {category}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Monthly Amount ($)"
                                type="number"
                                value={formData.monthly_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: Number(e.target.value) }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Annual Inflation Rate (%)"
                                type="number"
                                value={formData.annual_inflation_rate}
                                onChange={(e) => setFormData(prev => ({ ...prev, annual_inflation_rate: Number(e.target.value) }))}
                                inputProps={{ step: 0.01 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.is_discretionary}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_discretionary: e.target.checked }))}
                                    />
                                }
                                label="Discretionary Expense"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notes"
                                multiline
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : (editingExpense ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Expenses;