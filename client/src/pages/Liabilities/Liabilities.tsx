import React, { useCallback, useState } from 'react';
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
    Divider,
    Switch,
    FormControlLabel,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    TrendingDown as TrendingDownIcon,
    CreditCard as CreditCardIcon,
    Home as HomeIcon,
    DirectionsCar as CarIcon,
    School as SchoolIcon,
    AccountBalance as BankIcon,
    EuroSymbol as MoneyIcon,
} from '@mui/icons-material';
import { CategoryPieChart } from '../../components/charts/CategoryPieChart';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { Liability, LiabilityType, INVESTABLE_ASSET_TYPES } from '../../types';
import { useFinancial } from '../../contexts/FinancialContext';
import {
    formatLocaleDate,
    formatLocaleMonth,
    parseLocalCalendarDate,
    toDateInputValue,
    toMonthInputValue,
} from '../../utils/dateInput';
import { formatCurrency } from '../../utils/currency';
import { resolveLiabilityStartingBalance } from '../../utils/liabilityPayoffProjection';
import {
    LiabilityPayoffCard,
    defaultPayoffScenarioState,
    LiabilityPayoffScenarioState,
} from './LiabilityPayoffCard';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';
import { getChartSeriesColors } from '../../theme/tokens';
import { useTranslation } from 'react-i18next';

type LiabilityFormData = Partial<Liability>;

const Liabilities: React.FC = () => {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const { state, createLiability, updateLiability, deleteLiability } = useFinancial();
    const { liabilities, assets, loading, error } = state;
    const [formError, setFormError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
    const [payoffScenarioByLiability, setPayoffScenarioByLiability] = useState<
        Record<string, LiabilityPayoffScenarioState>
    >({});

    const getPayoffScenarioState = useCallback(
        (liabilityId: string): LiabilityPayoffScenarioState =>
            payoffScenarioByLiability[liabilityId] ?? defaultPayoffScenarioState(),
        [payoffScenarioByLiability]
    );

    const setPayoffScenarioState = useCallback((liabilityId: string, next: LiabilityPayoffScenarioState) => {
        setPayoffScenarioByLiability((prev) => ({ ...prev, [liabilityId]: next }));
    }, []);
    const [formData, setFormData] = useState<LiabilityFormData>({
        name: '',
        type: 'credit_card',
        current_balance: 0,
        interest_rate: 0,
        monthly_payment: 0,
        minimum_payment: 0,
        due_date: '',
        as_of_month: '',
        notes: '',
        // Special repayment fields
        special_repayment_enabled: false,
        special_repayment_amount: 0,
        special_repayment_frequency: 'monthly',
        max_annual_prepayment_percentage: 0,
        prepayment_penalty: false,
        prepayment_penalty_rate: 0,
        invest_after_payoff: false,
        payoff_invest_asset_id: null,
    });

    const liabilityTypeLabels: Record<LiabilityType, string> = {
        mortgage: t('pages.liabilities.types.mortgage'),
        auto_loan: t('pages.liabilities.types.auto_loan'),
        personal_loan: t('pages.liabilities.types.personal_loan'),
        credit_card: t('pages.liabilities.types.credit_card'),
        student_loan: t('pages.liabilities.types.student_loan'),
        other_debt: t('pages.liabilities.types.other_debt'),
    };

    const liabilityTypeIcons: Record<LiabilityType, React.ReactElement> = {
        mortgage: <HomeIcon />,
        auto_loan: <CarIcon />,
        personal_loan: <MoneyIcon />,
        credit_card: <CreditCardIcon />,
        student_loan: <SchoolIcon />,
        other_debt: <BankIcon />,
    };

    const handleSubmit = async () => {
        if (!formData.name?.trim()) {
            setFormError(t('pages.liabilities.form.errors.nameRequired'));
            return;
        }
        setFormError(null);
        try {
            if (editingLiability) {
                await updateLiability(editingLiability.id, formData);
            } else {
                await createLiability(formData);
            }
            handleCloseDialog();
        } catch {
            /* context error */
        }
    };

    const handleEdit = (liability: Liability) => {
        setEditingLiability(liability);
        setFormData({
            name: liability.name,
            type: liability.type,
            current_balance: liability.current_balance,
            interest_rate: liability.interest_rate || 0,
            monthly_payment: liability.monthly_payment || 0,
            minimum_payment: liability.minimum_payment || 0,
            due_date: toDateInputValue(liability.due_date),
            as_of_month: toMonthInputValue(liability.as_of_month),
            notes: liability.notes || '',
            // Special repayment fields
            special_repayment_enabled: liability.special_repayment_enabled || false,
            special_repayment_amount: liability.special_repayment_amount || 0,
            special_repayment_frequency: liability.special_repayment_frequency || 'monthly',
            max_annual_prepayment_percentage: liability.max_annual_prepayment_percentage || 0,
            prepayment_penalty: liability.prepayment_penalty || false,
            prepayment_penalty_rate: liability.prepayment_penalty_rate || 0,
            invest_after_payoff: liability.invest_after_payoff || false,
            payoff_invest_asset_id: liability.payoff_invest_asset_id || null,
        });
        setOpenDialog(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this liability?')) {
            return;
        }
        await deleteLiability(id);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingLiability(null);
        setFormData({
            name: '',
            type: 'credit_card',
            current_balance: 0,
            interest_rate: 0,
            monthly_payment: 0,
            minimum_payment: 0,
            due_date: '',
            as_of_month: '',
            notes: '',
            // Special repayment fields
            special_repayment_enabled: false,
            special_repayment_amount: 0,
            special_repayment_frequency: 'monthly',
            max_annual_prepayment_percentage: 0,
            prepayment_penalty: false,
            prepayment_penalty_rate: 0,
            invest_after_payoff: false,
            payoff_invest_asset_id: null,
        });
        setFormError(null);
    };

    const investableAssets = assets.filter(
        (a) => INVESTABLE_ASSET_TYPES.includes(a.type) && a.include_in_projection !== false
    );

    const totalBalance = liabilities.reduce((sum, liability) => sum + Number(liability.current_balance), 0);
    const totalMonthlyPayments = liabilities.reduce((sum, liability) => sum + Number(liability.monthly_payment || 0), 0);

    // Calculate special repayment totals
    const totalSpecialRepayments = liabilities.reduce((sum, liability) => {
        if (liability.special_repayment_enabled && liability.special_repayment_amount) {
            let annualAmount = Number(liability.special_repayment_amount);
            if (liability.special_repayment_frequency === 'monthly') {
                annualAmount = Number(liability.special_repayment_amount) * 12;
            } else if (liability.special_repayment_frequency === 'quarterly') {
                annualAmount = Number(liability.special_repayment_amount) * 4;
            }
            return sum + annualAmount;
        }
        return sum;
    }, 0);

    const totalMonthlySpecialRepayments = totalSpecialRepayments / 12;

    // Chart data
    const liabilityTypeData = Object.entries(
        liabilities.reduce((acc, liability) => {
            acc[liability.type] = (acc[liability.type] || 0) + Number(liability.current_balance);
            return acc;
        }, {} as Record<LiabilityType, number>)
    ).map(([type, amount]) => ({
        name: liabilityTypeLabels[type as LiabilityType],
        value: amount,
    }));

    const seriesColors = getChartSeriesColors(theme);

    return (
        <Box>
            <PageHeader
                icon={<CreditCardIcon color="primary" />}
                title={t('pages.liabilities.title')}
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
                        {t('actions.addLiability')}
                    </Button>
                }
            />

            {(error || formError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError || error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<TrendingDownIcon color="error" />}
                        label={t('pages.liabilities.kpi.totalBalance')}
                        value={formatCurrency(totalBalance)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<MoneyIcon color="warning" />}
                        label={t('pages.liabilities.kpi.monthlyPayments')}
                        value={formatCurrency(totalMonthlyPayments)}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<AddIcon color="success" />}
                        label={t('pages.liabilities.kpi.specialRepayments')}
                        value={formatCurrency(totalMonthlySpecialRepayments)}
                        footer={t('pages.liabilities.kpi.monthlyAverage')}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                <Grid item xs={12} md={3}>
                    <StatCard
                        icon={<CreditCardIcon color="info" />}
                        label={t('pages.liabilities.kpi.totalLiabilities')}
                        value={liabilities.length}
                        sx={{ height: '100%' }}
                    />
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.liabilities.charts.distribution')}
                        </Typography>
                        <CategoryPieChart
                            data={liabilityTypeData.map((entry, index) => ({
                                ...entry,
                                color: seriesColors[index % seriesColors.length],
                            }))}
                            height={300}
                            formatValue={formatCurrency}
                            tooltipLabel={t('pages.liabilities.charts.tooltipBalance')}
                            emptyMessage={t('pages.liabilities.charts.empty')}
                        />
                    </GlassSurface>
                </Grid>

                <Grid item xs={12} md={6}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.liabilities.charts.paymentBreakdown')}
                        </Typography>
                        <SimpleBarChart
                            data={[
                                { name: t('pages.liabilities.charts.regularPayments'), value: totalMonthlyPayments, color: '#ff9800' },
                                { name: t('pages.liabilities.charts.specialRepayments'), value: totalMonthlySpecialRepayments, color: '#4caf50' },
                            ]}
                            height={300}
                            tooltipLabel={t('pages.liabilities.charts.tooltipMonthlyAmount')}
                            defaultColor="#8884d8"
                        />
                    </GlassSurface>
                </Grid>

                {/* Debt payoff timeline */}
                {liabilities.length > 0 && (
                    <Grid item xs={12}>
                        <GlassSurface sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                {t('pages.liabilities.payoff.title')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                {t('pages.liabilities.payoff.subtitle')}
                            </Typography>
                            {liabilities.map((liability, index) => (
                                <LiabilityPayoffCard
                                    key={liability.id}
                                    liability={liability}
                                    liabilityTypeLabel={liabilityTypeLabels[liability.type]}
                                    typeIcon={liabilityTypeIcons[liability.type]}
                                    scenarioState={getPayoffScenarioState(liability.id)}
                                    onScenarioStateChange={(next) => setPayoffScenarioState(liability.id, next)}
                                    defaultExpanded={index === 0}
                                />
                            ))}
                        </GlassSurface>
                    </Grid>
                )}

                {/* Liabilities Table */}
                <Grid item xs={12}>
                    <GlassSurface sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('pages.liabilities.table.title')}
                        </Typography>
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <ResponsiveDataView
                                rows={liabilities}
                                getRowId={(l) => l.id}
                                mobilePrimary={(l) => l.name}
                                columns={
                                    [
                                        {
                                            id: 'name',
                                            label: 'Name',
                                            render: (l) => (
                                                <Box display="flex" alignItems="center">
                                                    {liabilityTypeIcons[l.type]}
                                                    <Typography sx={{ ml: 1 }}>{l.name}</Typography>
                                                </Box>
                                            ),
                                        },
                                        {
                                            id: 'type',
                                            label: 'Type',
                                            render: (l) => (
                                                <Chip label={liabilityTypeLabels[l.type]} size="small" variant="outlined" />
                                            ),
                                        },
                                        {
                                            id: 'balance',
                                            label: 'Balance',
                                            align: 'right',
                                            render: (l) => formatCurrency(l.current_balance),
                                        },
                                        {
                                            id: 'interest',
                                            label: 'Interest Rate',
                                            align: 'right',
                                            render: (l) => (l.interest_rate ? `${l.interest_rate}%` : 'N/A'),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'monthly',
                                            label: 'Monthly Payment',
                                            align: 'right',
                                            render: (l) => formatCurrency(l.monthly_payment || 0),
                                        },
                                        {
                                            id: 'special',
                                            label: 'Special Repayment',
                                            align: 'right',
                                            render: (l) =>
                                                l.special_repayment_enabled && l.special_repayment_amount ? (
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {formatCurrency(l.special_repayment_amount)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {l.special_repayment_frequency}
                                                        </Typography>
                                                    </Box>
                                                ) : (
                                                    'N/A'
                                                ),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'due',
                                            label: 'Due Date',
                                            align: 'right',
                                            render: (l) => formatLocaleDate(l.due_date, 'N/A'),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'asOf',
                                            label: 'As of Month',
                                            align: 'right',
                                            render: (l) => formatLocaleMonth(l.as_of_month, 'N/A'),
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'stale',
                                            label: 'Staleness',
                                            align: 'right',
                                            render: (l) => {
                                                if (!l.as_of_month) return 'N/A';
                                                const now = new Date();
                                                const asOf = parseLocalCalendarDate(l.as_of_month);
                                                if (!asOf) return 'N/A';
                                                const months =
                                                    (now.getFullYear() - asOf.getFullYear()) * 12 + (now.getMonth() - asOf.getMonth());
                                                if (months <= 1) return 'Current';
                                                return `${months} mo old`;
                                            },
                                            hideOnMobile: true,
                                        },
                                        {
                                            id: 'today',
                                            label: 'Balance Today',
                                            align: 'right',
                                            render: (l) => formatCurrency(Math.round(resolveLiabilityStartingBalance(l))),
                                            hideOnMobile: true,
                                        },
                                    ] as ResponsiveColumn<Liability>[]
                                }
                                actions={(l) => (
                                    <>
                                        <IconButton onClick={() => handleEdit(l)} size="small" aria-label="Edit liability">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => handleDelete(l.id)}
                                            size="small"
                                            color="error"
                                            aria-label="Delete liability"
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
                    {editingLiability ? t('pages.liabilities.form.editTitle') : t('pages.liabilities.form.addTitle')}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.name')}
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>{t('pages.liabilities.form.type')}</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as LiabilityType }))}
                                    label={t('pages.liabilities.form.type')}
                                >
                                    {Object.entries(liabilityTypeLabels).map(([value, label]) => (
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
                                label={t('pages.liabilities.form.currentBalance')}
                                type="number"
                                value={formData.current_balance}
                                onChange={(e) => setFormData(prev => ({ ...prev, current_balance: Number(e.target.value) }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.interestRate')}
                                type="number"
                                value={formData.interest_rate}
                                onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: Number(e.target.value) }))}
                                inputProps={{ step: 0.01 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.monthlyPayment')}
                                type="number"
                                value={formData.monthly_payment}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthly_payment: Number(e.target.value) }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.minimumPayment')}
                                type="number"
                                value={formData.minimum_payment}
                                onChange={(e) => setFormData(prev => ({ ...prev, minimum_payment: Number(e.target.value) }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.dueDate')}
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.asOfMonth')}
                                type="month"
                                value={formData.as_of_month || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, as_of_month: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                helperText={t('pages.liabilities.form.asOfHelper')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label={t('pages.liabilities.form.notes')}
                                multiline
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </Grid>

                        {/* Special Repayment Section */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }}>
                                <Typography variant="h6" color="primary">
                                    {t('pages.liabilities.form.specialSection')}
                                </Typography>
                            </Divider>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.special_repayment_enabled || false}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            special_repayment_enabled: e.target.checked
                                        }))}
                                    />
                                }
                                label={t('pages.liabilities.form.specialEnable')}
                            />
                        </Grid>

                        {formData.special_repayment_enabled && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label={t('pages.liabilities.form.specialAmount')}
                                        type="number"
                                        value={formData.special_repayment_amount || 0}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            special_repayment_amount: Number(e.target.value)
                                        }))}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>{t('pages.liabilities.form.specialFrequency')}</InputLabel>
                                        <Select
                                            value={formData.special_repayment_frequency || 'monthly'}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                special_repayment_frequency: e.target.value as 'monthly' | 'quarterly' | 'annual'
                                            }))}
                                            label={t('pages.liabilities.form.specialFrequency')}
                                        >
                                            <MenuItem value="monthly">{t('pages.liabilities.form.monthly')}</MenuItem>
                                            <MenuItem value="quarterly">{t('pages.liabilities.form.quarterly')}</MenuItem>
                                            <MenuItem value="annual">{t('pages.liabilities.form.annual')}</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label={t('pages.liabilities.form.maxAnnualPrepay')}
                                        type="number"
                                        value={formData.max_annual_prepayment_percentage || 0}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            max_annual_prepayment_percentage: Number(e.target.value)
                                        }))}
                                        inputProps={{ step: 0.1, min: 0, max: 100 }}
                                        helperText={t('pages.liabilities.form.maxAnnualPrepayHelper')}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.prepayment_penalty || false}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    prepayment_penalty: e.target.checked
                                                }))}
                                            />
                                        }
                                        label={t('pages.liabilities.form.penaltyApplies')}
                                    />
                                </Grid>

                                {formData.prepayment_penalty && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label={t('pages.liabilities.form.penaltyRate')}
                                            type="number"
                                            value={formData.prepayment_penalty_rate || 0}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                prepayment_penalty_rate: Number(e.target.value)
                                            }))}
                                            inputProps={{ step: 0.01 }}
                                        />
                                    </Grid>
                                )}
                            </>
                        )}

                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }}>
                                <Typography variant="h6" color="primary">
                                    {t('pages.liabilities.form.investSection')}
                                </Typography>
                            </Divider>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.invest_after_payoff || false}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            invest_after_payoff: e.target.checked,
                                        }))}
                                    />
                                }
                                label={t('pages.liabilities.form.investAfterPayoff')}
                            />
                        </Grid>

                        {formData.invest_after_payoff && (
                            <>
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        {t('pages.liabilities.form.investInfo')}
                                    </Alert>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>{t('pages.liabilities.form.investInto')}</InputLabel>
                                        <Select
                                            value={formData.payoff_invest_asset_id || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                payoff_invest_asset_id: e.target.value || null,
                                            }))}
                                            label={t('pages.liabilities.form.investInto')}
                                        >
                                            {investableAssets.length === 0 ? (
                                                <MenuItem value="" disabled>
                                                    {t('pages.liabilities.form.investNoAssets')}
                                                </MenuItem>
                                            ) : (
                                                investableAssets.map((asset) => (
                                                    <MenuItem key={asset.id} value={asset.id}>
                                                        {asset.name}
                                                    </MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading
                            ? <CircularProgress size={20} />
                            : (editingLiability ? t('common.update') : t('common.create'))}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Liabilities;