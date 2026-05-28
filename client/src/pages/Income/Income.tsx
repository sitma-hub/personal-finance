import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
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
    IconButton,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingUp as TrendingUpIcon,
    Work as WorkIcon,
    EuroSymbol as MoneyIcon,
    AccountBalance as BankIcon,
    Home as HomeIcon,
    Security as SecurityIcon,
    Business as BusinessIcon,
    Star as StarIcon,
} from '@mui/icons-material';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { IncomeStream, IncomeFormData, IncomeType } from '../../types';
import { useFinancial } from '../../contexts/FinancialContext';
import {
    annualRateToPercentInput,
    formatAnnualRatePercent,
    normalizeAnnualRate,
} from '../../utils/rateNormalization';
import { formatCurrency } from '../../utils/currency';
import { formatLocaleDate, toDateInputValue } from '../../utils/dateInput';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';
import { getChartSeriesColors } from '../../theme/tokens';

const Income: React.FC = () => {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
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

    const seriesColors = getChartSeriesColors(theme);

    return (
        <Box>
            <PageHeader
                title="Income Streams"
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                        Add Income Stream
                    </Button>
                }
            />

            {(error || formError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError || error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<TrendingUpIcon color="success" />}
                        label="Monthly Income"
                        value={formatCurrency(totalMonthlyIncome)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <StatCard
                        icon={<MoneyIcon color="primary" />}
                        label="Annual Income"
                        value={formatCurrency(totalAnnualIncome)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    <StatCard
                        icon={<WorkIcon color="info" />}
                        label="Income Streams"
                        value={incomeStreams.length}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Income Distribution by Type
                        </Typography>
                        <CategoryPieChart
                            data={incomeTypeData.map((entry, index) => ({
                                ...entry,
                                color: seriesColors[index % seriesColors.length],
                            }))}
                            height={300}
                            formatValue={formatCurrency}
                            tooltipLabel="Monthly Income"
                            emptyMessage="No income to display"
                        />
                    </GlassSurface>
                </Grid>

                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Income by Type (Monthly)
                        </Typography>
                        <SimpleBarChart
                            data={incomeTypeData}
                            height={300}
                            tooltipLabel="Monthly Income"
                            defaultColor="#4caf50"
                        />
                    </GlassSurface>
                </Grid>

                {/* Income Streams Table */}
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            All Income Streams
                        </Typography>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <ResponsiveDataView
                                rows={incomeStreams}
                                getRowId={(i) => i.id}
                                mobilePrimary={(i) => i.name}
                                columns={
                                    [
                                        {
                                            id: 'name',
                                            label: 'Name',
                                            render: (i) => (
                                                <Box display="flex" alignItems="center">
                                                    {incomeTypeIcons[i.type]}
                                                    <Typography sx={{ ml: 1 }}>{i.name}</Typography>
                                                </Box>
                                            ),
                                        },
                                        {
                                            id: 'type',
                                            label: 'Type',
                                            render: (i) => (
                                                <Chip label={incomeTypeLabels[i.type]} size="small" variant="outlined" />
                                            ),
                                        },
                                        {
                                            id: 'amount',
                                            label: 'Amount',
                                            align: 'right',
                                            render: (i) => formatCurrency(i.current_amount),
                                        },
                                        {
                                            id: 'frequency',
                                            label: 'Frequency',
                                            align: 'center',
                                            render: (i) => (
                                                <Chip
                                                    label={frequencyLabels[i.frequency]}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            ),
                                        },
                                        {
                                            id: 'growth',
                                            label: 'Growth Rate',
                                            align: 'right',
                                            render: (i) => `${formatAnnualRatePercent(i.annual_growth_rate)}%`,
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'start',
                                            label: 'Start Date',
                                            align: 'center',
                                            render: (i) => formatLocaleDate(i.start_date, 'N/A'),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'end',
                                            label: 'End Date',
                                            align: 'center',
                                            render: (i) => formatLocaleDate(i.end_date, 'N/A'),
                                            hideOnMobile: true,
                                        },
                                    ] as ResponsiveColumn<IncomeStream>[]
                                }
                                actions={(i) => (
                                    <>
                                        <IconButton onClick={() => handleEdit(i)} size="small" aria-label="Edit income">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDelete(i.id)}
                                            size="small"
                                            color="error"
                                            aria-label="Delete income"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </>
                                )}
                            />
                        )}
                    </GlassSurface>
                </Grid>
            </Grid>

            {/* Add/Edit Dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                fullScreen={fullScreenDialog}
            >
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
                                label="Current Amount (€)"
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