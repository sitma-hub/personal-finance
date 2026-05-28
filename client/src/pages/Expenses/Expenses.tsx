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
    Switch,
    FormControlLabel,
    ToggleButton,
    ToggleButtonGroup,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingDown as TrendingDownIcon,
    Receipt as ReceiptIcon,
    ShoppingCart as ShoppingCartIcon,
    Home as HomeIcon,
    DirectionsCar as CarIcon,
    Restaurant as RestaurantIcon,
    HealthAndSafety as HealthIcon,
    School as SchoolIcon,
    SportsEsports as EntertainmentIcon,
    EuroSymbol as MoneyIcon,
    Bolt as BoltIcon,
    Bathtub as BathIcon,
    Category as CategoryIcon,
} from '@mui/icons-material';
import { CategoryPieChart, PieLegendMode } from '../../components/charts/CategoryPieChart';
import { Expense, ExpenseFormData } from '../../types';
import { useFinancial } from '../../contexts/FinancialContext';
import {
    annualRateToPercentInput,
    formatAnnualRatePercent,
    normalizeAnnualRate,
} from '../../utils/rateNormalization';
import { getLiabilityMonthlyPayment } from '../../utils/liabilityCashFlow';
import { formatCurrency } from '../../utils/currency';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';
import { useTranslation } from 'react-i18next';

const Expenses: React.FC = () => {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const { state, createExpense, updateExpense, deleteExpense } = useFinancial();
    const { expenses, liabilities, loading, error } = state;
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
    const [pieLegendMode, setPieLegendMode] = useState<PieLegendMode>('percent');

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
        'Utilities': <BoltIcon />,
        'Insurance': <HealthIcon />,
        'Personal Care': <BathIcon />,
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

    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setFormError(t('pages.expenses.form.errors.nameRequired'));
            return;
        }
        if (!formData.category.trim()) {
            setFormError(t('pages.expenses.form.errors.categoryRequired'));
            return;
        }
        setFormError(null);
        try {
            const payload = {
                ...formData,
                annual_inflation_rate: normalizeAnnualRate(formData.annual_inflation_rate),
            };
            if (editingExpense) {
                await updateExpense(editingExpense.id, payload);
            } else {
                await createExpense(payload);
            }
            handleCloseDialog();
        } catch {
            /* context error */
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
        if (!window.confirm(t('pages.expenses.confirmDelete'))) {
            return;
        }
        await deleteExpense(id);
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
        setFormError(null);
    };

    const livingExpenses = expenses.reduce((sum, expense) => sum + Number(expense.monthly_amount), 0);
    const debtPayments = liabilities.reduce((sum, l) => sum + getLiabilityMonthlyPayment(l), 0);
    const totalMonthlyOutflow = livingExpenses + debtPayments;
    const totalAnnualOutflow = totalMonthlyOutflow * 12;
    const discretionaryExpenses = expenses.filter(e => e.is_discretionary).reduce((sum, expense) => sum + Number(expense.monthly_amount), 0);
    const essentialLiving = livingExpenses - discretionaryExpenses;

    const debtPaymentRows = liabilities
        .map((l) => ({ liability: l, monthly: getLiabilityMonthlyPayment(l) }))
        .filter((row) => row.monthly > 0)
        .sort((a, b) => b.monthly - a.monthly);

    // Chart data: living expenses by category + each debt line
    const categoryData = [
        ...Object.entries(
            expenses.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + Number(expense.monthly_amount);
                return acc;
            }, {} as Record<string, number>)
        ).map(([category, amount]) => ({
            name: t(`pages.expenses.categories.${category}` as const, { defaultValue: category }),
            value: amount,
            color: categoryColors[category] || '#8884d8',
        })),
        ...debtPaymentRows.map((row) => ({
            name: t('pages.expenses.charts.debtSlice', { name: row.liability.name }),
            value: row.monthly,
            color: '#c62828',
        })),
    ];

    const outflowSplitData = [
        { name: t('pages.expenses.charts.outflowSplit.essential'), value: essentialLiving, color: '#4caf50' },
        { name: t('pages.expenses.charts.outflowSplit.discretionary'), value: discretionaryExpenses, color: '#ff9800' },
        ...(debtPayments > 0 ? [{ name: t('pages.expenses.charts.outflowSplit.debtPayments'), value: debtPayments, color: '#c62828' }] : []),
    ];

    return (
        <Box>
            <PageHeader
                icon={<ReceiptIcon color="primary" />}
                title={t('pages.expenses.title')}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                        {t('actions.addExpense')}
                    </Button>
                }
            />

            {(error || formError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError || error}
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
                {t('pages.expenses.help.debtTrackedPrefix')}{' '}
                <Link component={RouterLink} to="/liabilities">{t('pages.liabilities.title')}</Link>
                {t('pages.expenses.help.debtTrackedSuffix')}
            </Alert>

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<TrendingDownIcon color="error" />}
                        label={t('pages.expenses.kpi.totalMonthlyOutflow')}
                        value={formatCurrency(totalMonthlyOutflow)}
                        footer={t('pages.expenses.kpi.totalMonthlyOutflowFooter', {
                            living: formatCurrency(livingExpenses),
                            debt: formatCurrency(debtPayments),
                        })}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<MoneyIcon color="warning" />}
                        label={t('pages.expenses.kpi.annualOutflow')}
                        value={formatCurrency(totalAnnualOutflow)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<ShoppingCartIcon color="success" />}
                        label={t('pages.expenses.kpi.essential')}
                        value={formatCurrency(essentialLiving)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<EntertainmentIcon color="info" />}
                        label={t('pages.expenses.kpi.discretionary')}
                        value={formatCurrency(discretionaryExpenses)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                {/* Charts */}
                <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end">
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={pieLegendMode}
                            onChange={(_, value: PieLegendMode | null) => {
                                if (value) setPieLegendMode(value);
                            }}
                            aria-label={t('pages.expenses.charts.legend.ariaGroup')}
                        >
                            <ToggleButton value="percent" aria-label={t('pages.expenses.charts.legend.ariaPercent')}>
                                {t('pages.expenses.charts.legend.percent')}
                            </ToggleButton>
                            <ToggleButton value="amount" aria-label={t('pages.expenses.charts.legend.ariaAmount')}>
                                {t('pages.expenses.charts.legend.amount')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.expenses.charts.byCategory')}
                        </Typography>
                        <CategoryPieChart
                            data={categoryData}
                            height={300}
                            legendMode={pieLegendMode}
                            formatValue={formatCurrency}
                            tooltipLabel={t('pages.expenses.charts.tooltipMonthlyAmount')}
                            emptyMessage={t('pages.expenses.charts.emptyExpenses')}
                        />
                    </GlassSurface>
                </Grid>

                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.expenses.charts.livingVsDebt')}
                        </Typography>
                        <CategoryPieChart
                            data={outflowSplitData}
                            height={300}
                            legendMode={pieLegendMode}
                            formatValue={formatCurrency}
                            tooltipLabel={t('pages.expenses.charts.tooltipMonthlyAmount')}
                            emptyMessage={t('pages.expenses.charts.emptyOutflow')}
                        />
                    </GlassSurface>
                </Grid>

                {/* Debt payments from liabilities */}
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.expenses.debtPayments.title')}
                        </Typography>
                        {debtPaymentRows.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                {t('pages.expenses.debtPayments.emptyPrefix')}{' '}
                                <Link component={RouterLink} to="/liabilities">{t('pages.liabilities.title')}</Link>{' '}
                                {t('pages.expenses.debtPayments.emptySuffix')}
                            </Typography>
                        ) : (
                            <ResponsiveDataView
                                rows={debtPaymentRows}
                                getRowId={(r) => r.liability.id}
                                mobilePrimary={(r) => r.liability.name}
                                columns={
                                    [
                                        { id: 'name', label: t('pages.expenses.debtPayments.table.name'), render: (r) => r.liability.name },
                                        {
                                            id: 'type',
                                            label: t('pages.expenses.debtPayments.table.type'),
                                            render: (r) => (
                                                <Chip
                                                    label={r.liability.type.replace(/_/g, ' ')}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            ),
                                        },
                                        {
                                            id: 'monthly',
                                            label: t('pages.expenses.debtPayments.table.monthlyPayment'),
                                            align: 'right',
                                            render: (r) => formatCurrency(r.monthly),
                                        },
                                        {
                                            id: 'special',
                                            label: t('pages.expenses.debtPayments.table.specialRepayment'),
                                            render: (r) =>
                                                r.liability.special_repayment_enabled
                                                    ? `${formatCurrency(Number(r.liability.special_repayment_amount || 0))} / ${
                                                          r.liability.special_repayment_frequency || 'monthly'
                                                      }`
                                                    : '—',
                                        },
                                    ] as ResponsiveColumn<(typeof debtPaymentRows)[number]>[]
                                }
                            />
                        )}
                    </GlassSurface>
                </Grid>

                {/* Living expenses table */}
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.expenses.livingTable.title')}
                        </Typography>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <ResponsiveDataView
                                rows={expenses}
                                getRowId={(e) => e.id}
                                mobilePrimary={(e) => e.name}
                                columns={
                                    [
                                        {
                                            id: 'name',
                                            label: t('pages.expenses.livingTable.columns.name'),
                                            render: (e) => (
                                                <Box display="flex" alignItems="center">
                                                    {categoryIcons[e.category]}
                                                    <Typography sx={{ ml: 1 }}>{e.name}</Typography>
                                                </Box>
                                            ),
                                        },
                                        {
                                            id: 'category',
                                            label: t('pages.expenses.livingTable.columns.category'),
                                            render: (e) => (
                                                <Chip
                                                    label={t(`pages.expenses.categories.${e.category}` as const, { defaultValue: e.category })}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ backgroundColor: categoryColors[e.category] + '20' }}
                                                />
                                            ),
                                        },
                                        {
                                            id: 'monthly',
                                            label: t('pages.expenses.livingTable.columns.monthlyAmount'),
                                            align: 'right',
                                            render: (e) => formatCurrency(e.monthly_amount),
                                        },
                                        {
                                            id: 'inflation',
                                            label: t('pages.expenses.livingTable.columns.annualInflation'),
                                            align: 'right',
                                            render: (e) => `${formatAnnualRatePercent(e.annual_inflation_rate)}%`,
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'type',
                                            label: t('pages.expenses.livingTable.columns.type'),
                                            align: 'center',
                                            render: (e) => (
                                                <Chip
                                                    label={e.is_discretionary ? t('pages.expenses.kpi.discretionary') : t('pages.expenses.kpi.essential')}
                                                    size="small"
                                                    color={e.is_discretionary ? 'warning' : 'success'}
                                                    variant="outlined"
                                                />
                                            ),
                                        },
                                    ] as ResponsiveColumn<Expense>[]
                                }
                                actions={(e) => (
                                    <>
                                        <IconButton onClick={() => handleEdit(e)} size="small" aria-label="Edit expense">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDelete(e.id)}
                                            size="small"
                                            color="error"
                                            aria-label="Delete expense"
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
                    {editingExpense ? t('pages.expenses.form.editTitle') : t('pages.expenses.form.addTitle')}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.expenses.form.name')}
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>{t('pages.expenses.form.category')}</InputLabel>
                                <Select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    label={t('pages.expenses.form.category')}
                                >
                                    {expenseCategories.map((category) => (
                                        <MenuItem key={category} value={category}>
                                            <Box display="flex" alignItems="center">
                                                {categoryIcons[category]}
                                                <Typography sx={{ ml: 1 }}>
                                                    {t(`pages.expenses.categories.${category}` as const, { defaultValue: category })}
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
                                label={t('pages.expenses.form.monthlyAmount')}
                                type="number"
                                value={formData.monthly_amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: Number(e.target.value) }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.expenses.form.annualInflation')}
                                type="number"
                                value={annualRateToPercentInput(formData.annual_inflation_rate)}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        annual_inflation_rate: (parseFloat(e.target.value) || 0) / 100,
                                    }))
                                }
                                inputProps={{ step: 0.1, min: 0 }}
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
                                label={t('pages.expenses.form.discretionaryExpense')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('pages.expenses.form.notes')}
                                multiline
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : (editingExpense ? t('common.update') : t('common.create'))}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Expenses;