import React, { useState } from 'react';
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
    TrendingUp as TrendingUpIcon,
    Work as WorkIcon,
    AttachMoney as MoneyIcon,
    AccountBalance as BankIcon,
    Home as HomeIcon,
    School as SchoolIcon,
    Security as SecurityIcon,
    Business as BusinessIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { IncomeStream, IncomeFormData, IncomeType } from '../../types';
import { useFinancial } from '../../contexts/FinancialContext';
import {
    annualRateToPercentInput,
    formatAnnualRatePercent,
    normalizeAnnualRate,
} from '../../utils/rateNormalization';
import { toDateInputValue } from '../../utils/dateInput';

const Income: React.FC = () => {
    const { state, createIncome, updateIncome, deleteIncome } = useFinancial();
    const { incomeStreams, loading, error } = state;
    const [openDialog, setOpenDialog] = useState(false);
    const [editingIncome, setEditingIncome] = useState<IncomeStream | null>(null);
    const [formData, setFormData] = useState<IncomeFormData>({
        name: '',
        type: 'salary',
        current_amount: 0,
        frequency: 'monthly',
        annual_growth_rate: 0,
        start_date: '',
        end_date: '',
        notes: '',
    });

    const incomeTypeLabels: Record<IncomeType, string> = {
        salary: 'Salary',
        hourly_wage: 'Hourly Wage',
        freelance: 'Freelance',
        investment_income: 'Investment Income',
        rental_income: 'Rental Income',
        pension: 'Pension',
        social_security: 'Social Security',
        other_income: 'Other Income',
    };

    const incomeTypeIcons: Record<IncomeType, React.ReactElement> = {
        salary: <WorkIcon />,
        hourly_wage: <WorkIcon />,
        freelance: <BusinessIcon />,
        investment_income: <BankIcon />,
        rental_income: <HomeIcon />,
        pension: <SecurityIcon />,
        social_security: <SecurityIcon />,
        other_income: <StarIcon />,
    };

    const frequencyLabels = {
        monthly: 'Monthly',
        annual: 'Annual',
        hourly: 'Hourly',
    };

    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setFormError('Please enter an income stream name');
            return;
        }
        setFormError(null);
        try {
            const payload = {
                ...formData,
                annual_growth_rate: normalizeAnnualRate(formData.annual_growth_rate),
            };
            if (editingIncome) {
                await updateIncome(editingIncome.id, payload);
            } else {
                await createIncome(payload);
            }
            handleCloseDialog();
        } catch {
            /* context error */
        }
    };

    const handleEdit = (income: IncomeStream) => {
        setEditingIncome(income);
        setFormData({
            name: income.name,
            type: income.type,
            current_amount: income.current_amount,
            frequency: income.frequency,
            annual_growth_rate: income.annual_growth_rate,
            start_date: toDateInputValue(income.start_date),
            end_date: toDateInputValue(income.end_date),
            notes: income.notes || '',
        });
        setOpenDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this income stream?')) {
            return;
        }
        await deleteIncome(id);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingIncome(null);
        setFormData({
            name: '',
            type: 'salary',
            current_amount: 0,
            frequency: 'monthly',
            annual_growth_rate: 0,
            start_date: '',
            end_date: '',
            notes: '',
        });
        setFormError(null);
    };

    // Calculate totals
    const totalMonthlyIncome = incomeStreams.reduce((sum, income) => {
        let monthlyAmount = Number(income.current_amount);
        if (income.frequency === 'annual') {
            monthlyAmount = Number(income.current_amount) / 12;
        } else if (income.frequency === 'hourly') {
            monthlyAmount = Number(income.current_amount) * 40 * 4.33; // Assuming 40 hours/week, 4.33 weeks/month
        }
        return sum + monthlyAmount;
    }, 0);

    const totalAnnualIncome = totalMonthlyIncome * 12;

    // Chart data
    const incomeTypeData = Object.entries(
        incomeStreams.reduce((acc, income) => {
            let monthlyAmount = Number(income.current_amount);
            if (income.frequency === 'annual') {
                monthlyAmount = Number(income.current_amount) / 12;
            } else if (income.frequency === 'hourly') {
                monthlyAmount = Number(income.current_amount) * 40 * 4.33;
            }
            acc[income.type] = (acc[income.type] || 0) + monthlyAmount;
            return acc;
        }, {} as Record<IncomeType, number>)
    ).map(([type, amount]) => ({
        name: incomeTypeLabels[type as IncomeType],
        value: amount,
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" gutterBottom>
                    Income Streams
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add Income Stream
                </Button>
            </Box>

            {(error || formError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError || error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Monthly Income</Typography>
                            </Box>
                            <Typography variant="h4" color="success.main">
                                ${totalMonthlyIncome.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Annual Income</Typography>
                            </Box>
                            <Typography variant="h4" color="primary.main">
                                ${totalAnnualIncome.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <WorkIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">Income Streams</Typography>
                            </Box>
                            <Typography variant="h4" color="info.main">
                                {incomeStreams.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Income Distribution by Type
                        </Typography>
                        <CategoryPieChart
                            data={incomeTypeData.map((entry, index) => ({
                                ...entry,
                                color: COLORS[index % COLORS.length],
                            }))}
                            height={300}
                            formatValue={(v) => `$${v.toLocaleString()}`}
                            tooltipLabel="Monthly Income"
                            emptyMessage="No income to display"
                        />
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Income by Type (Monthly)
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={incomeTypeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Monthly Income']} />
                                <Bar dataKey="value" fill="#4caf50" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Income Streams Table */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            All Income Streams
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
                                            <TableCell>Type</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                            <TableCell align="center">Frequency</TableCell>
                                            <TableCell align="right">Growth Rate</TableCell>
                                            <TableCell align="center">Start Date</TableCell>
                                            <TableCell align="center">End Date</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {incomeStreams.map((income) => (
                                            <TableRow key={income.id}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center">
                                                        {incomeTypeIcons[income.type]}
                                                        <Typography sx={{ ml: 1 }}>
                                                            {income.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={incomeTypeLabels[income.type]}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    ${income.current_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={frequencyLabels[income.frequency]}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatAnnualRatePercent(income.annual_growth_rate)}%
                                                </TableCell>
                                                <TableCell align="center">
                                                    {income.start_date || 'N/A'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    {income.end_date || 'N/A'}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        onClick={() => handleEdit(income)}
                                                        size="small"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => handleDelete(income.id)}
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
                    {editingIncome ? 'Edit Income Stream' : 'Add New Income Stream'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Income Stream Name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Type</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as IncomeType }))}
                                    label="Type"
                                >
                                    {Object.entries(incomeTypeLabels).map(([value, label]) => (
                                        <MenuItem key={value} value={value}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Current Amount ($)"
                                type="number"
                                value={formData.current_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, current_amount: Number(e.target.value) }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Frequency</InputLabel>
                                <Select
                                    value={formData.frequency}
                                    onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as 'monthly' | 'annual' | 'hourly' }))}
                                    label="Frequency"
                                >
                                    {Object.entries(frequencyLabels).map(([value, label]) => (
                                        <MenuItem key={value} value={value}>
                                            {label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Annual Growth Rate (%)"
                                type="number"
                                value={annualRateToPercentInput(formData.annual_growth_rate)}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        annual_growth_rate: (parseFloat(e.target.value) || 0) / 100,
                                    }))
                                }
                                inputProps={{ step: 0.1, min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Start Date"
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="End Date"
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
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
                        {loading ? <CircularProgress size={20} /> : (editingIncome ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Income;