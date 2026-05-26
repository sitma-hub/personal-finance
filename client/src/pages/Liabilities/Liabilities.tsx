import React, { useCallback, useState } from 'react';
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
import {
    projectLiabilityBalanceAtMonths,
    resolveLiabilityStartingBalance,
    monthsFromAsOfTo,
} from '../../utils/liabilityPayoffProjection';
import {
    LiabilityPayoffCard,
    defaultPayoffScenarioState,
    LiabilityPayoffScenarioState,
} from './LiabilityPayoffCard';

type LiabilityFormData = Partial<Liability>;

const Liabilities: React.FC = () => {
    const { state, createLiability, updateLiability, deleteLiability } = useFinancial();
    const { liabilities, assets, loading, error } = state;
    const [formError, setFormError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
    const [projectionMonths, setProjectionMonths] = useState<number>(0);
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
        mortgage: 'Mortgage',
        auto_loan: 'Auto Loan',
        personal_loan: 'Personal Loan',
        credit_card: 'Credit Card',
        student_loan: 'Student Loan',
        other_debt: 'Other Debt',
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
            setFormError('Please enter a liability name');
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" gutterBottom>
                    Liabilities
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add Liability
                </Button>
            </Box>

            <Box display="flex" alignItems="center" gap={2} mb={2}>
                <TextField
                    label="Project +N months"
                    type="number"
                    value={projectionMonths}
                    onChange={(e) => setProjectionMonths(Math.max(0, Number(e.target.value)))}
                    inputProps={{ min: 0 }}
                    size="small"
                />
            </Box>

            {(error || formError) && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
                    {formError || error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Balance</Typography>
                            </Box>
                            <Typography variant="h4" color="error">
                                {formatCurrency(totalBalance)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <MoneyIcon color="warning" sx={{ mr: 1 }} />
                                <Typography variant="h6">Monthly Payments</Typography>
                            </Box>
                            <Typography variant="h4" color="warning.main">
                                {formatCurrency(totalMonthlyPayments)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <AddIcon color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Special Repayments</Typography>
                            </Box>
                            <Typography variant="h4" color="success.main">
                                {formatCurrency(totalMonthlySpecialRepayments)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Monthly average
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={2}>
                                <CreditCardIcon color="info" sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Liabilities</Typography>
                            </Box>
                            <Typography variant="h4" color="info.main">
                                {liabilities.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Charts */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Liability Distribution by Type
                        </Typography>
                        <CategoryPieChart
                            data={liabilityTypeData.map((entry, index) => ({
                                ...entry,
                                color: COLORS[index % COLORS.length],
                            }))}
                            height={300}
                            formatValue={formatCurrency}
                            tooltipLabel="Balance"
                            emptyMessage="No liabilities to display"
                        />
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Payment Breakdown
                        </Typography>
                        <SimpleBarChart
                            data={[
                                { name: 'Regular Payments', value: totalMonthlyPayments, color: '#ff9800' },
                                { name: 'Special Repayments', value: totalMonthlySpecialRepayments, color: '#4caf50' },
                            ]}
                            height={300}
                            tooltipLabel="Monthly Amount"
                            defaultColor="#8884d8"
                        />
                    </Paper>
                </Grid>

                {/* Debt payoff timeline */}
                {liabilities.length > 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                Debt Payoff Timeline
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Projected balance until each debt is paid off. Compare baseline payments with your
                                saved plan and optional what-if strategies (not saved to the database).
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
                        </Paper>
                    </Grid>
                )}

                {/* Liabilities Table */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            All Liabilities
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
                                            <TableCell align="right">Balance</TableCell>
                                            <TableCell align="right">Interest Rate</TableCell>
                                            <TableCell align="right">Monthly Payment</TableCell>
                                            <TableCell align="right">Special Repayment</TableCell>
                                            <TableCell align="right">Due Date</TableCell>
                                            <TableCell align="right">As of Month</TableCell>
                                            <TableCell align="right">Staleness</TableCell>
                                            <TableCell align="right">Balance Today</TableCell>
                                            <TableCell align="right">Projected (+N mo)</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {liabilities.map((liability) => (
                                            <TableRow key={liability.id}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center">
                                                        {liabilityTypeIcons[liability.type]}
                                                        <Typography sx={{ ml: 1 }}>
                                                            {liability.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={liabilityTypeLabels[liability.type]}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(liability.current_balance)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {liability.interest_rate ? `${liability.interest_rate}%` : 'N/A'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(liability.monthly_payment || 0)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {liability.special_repayment_enabled && liability.special_repayment_amount ? (
                                                        <Box>
                                                            <Typography variant="body2">
                                                                {formatCurrency(liability.special_repayment_amount)}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {liability.special_repayment_frequency}
                                                            </Typography>
                                                        </Box>
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatLocaleDate(liability.due_date, 'N/A')}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatLocaleMonth(liability.as_of_month, 'N/A')}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(() => {
                                                        if (!liability.as_of_month) return 'N/A';
                                                        const now = new Date();
                                                        const asOf = parseLocalCalendarDate(liability.as_of_month);
                                                        if (!asOf) return 'N/A';
                                                        const months = (now.getFullYear() - asOf.getFullYear()) * 12 + (now.getMonth() - asOf.getMonth());
                                                        if (months <= 1) return 'Current';
                                                        return `${months} mo old`;
                                                    })()}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatCurrency(
                                                        Math.round(resolveLiabilityStartingBalance(liability))
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {(() => {
                                                        const monthsAhead = monthsFromAsOfTo(liability) + Number(projectionMonths || 0);
                                                        const projected = projectLiabilityBalanceAtMonths(liability, monthsAhead);
                                                        return formatCurrency(Math.round(projected));
                                                    })()}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        onClick={() => handleEdit(liability)}
                                                        size="small"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        onClick={() => handleDelete(liability.id)}
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
                    {editingLiability ? 'Edit Liability' : 'Add New Liability'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Liability Name"
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
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as LiabilityType }))}
                                    label="Type"
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
                                label="Current Balance (€)"
                                type="number"
                                value={formData.current_balance}
                                onChange={(e) => setFormData(prev => ({ ...prev, current_balance: Number(e.target.value) }))}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Interest Rate (%)"
                                type="number"
                                value={formData.interest_rate}
                                onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: Number(e.target.value) }))}
                                inputProps={{ step: 0.01 }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Monthly Payment (€)"
                                type="number"
                                value={formData.monthly_payment}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthly_payment: Number(e.target.value) }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Minimum Payment (€)"
                                type="number"
                                value={formData.minimum_payment}
                                onChange={(e) => setFormData(prev => ({ ...prev, minimum_payment: Number(e.target.value) }))}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Due Date"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="As of Month"
                                type="month"
                                value={formData.as_of_month || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, as_of_month: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                helperText="Month this balance applies to"
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

                        {/* Special Repayment Section */}
                        <Grid item xs={12}>
                            <Divider sx={{ my: 2 }}>
                                <Typography variant="h6" color="primary">
                                    Special Repayment Options
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
                                label="Enable Special Repayments"
                            />
                        </Grid>

                        {formData.special_repayment_enabled && (
                            <>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Special Repayment Amount (€)"
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
                                        <InputLabel>Repayment Frequency</InputLabel>
                                        <Select
                                            value={formData.special_repayment_frequency || 'monthly'}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                special_repayment_frequency: e.target.value as 'monthly' | 'quarterly' | 'annual'
                                            }))}
                                            label="Repayment Frequency"
                                        >
                                            <MenuItem value="monthly">Monthly</MenuItem>
                                            <MenuItem value="quarterly">Quarterly</MenuItem>
                                            <MenuItem value="annual">Annual</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Max Annual Prepayment %"
                                        type="number"
                                        value={formData.max_annual_prepayment_percentage || 0}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            max_annual_prepayment_percentage: Number(e.target.value)
                                        }))}
                                        inputProps={{ step: 0.1, min: 0, max: 100 }}
                                        helperText="Maximum percentage of principal that can be prepaid annually"
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
                                        label="Prepayment Penalty Applies"
                                    />
                                </Grid>

                                {formData.prepayment_penalty && (
                                    <Grid item xs={12} sm={6}>
                                        <TextField
                                            fullWidth
                                            label="Prepayment Penalty Rate (%)"
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
                                    After payoff
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
                                label="Invest monthly payment into stocks after this debt is paid off"
                            />
                        </Grid>

                        {formData.invest_after_payoff && (
                            <>
                                <Grid item xs={12}>
                                    <Alert severity="info">
                                        The net worth forecast on your Dashboard will show a second line
                                        reflecting extra investing once this liability is projected to be paid off.
                                    </Alert>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Invest into</InputLabel>
                                        <Select
                                            value={formData.payoff_invest_asset_id || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                payoff_invest_asset_id: e.target.value || null,
                                            }))}
                                            label="Invest into"
                                        >
                                            {investableAssets.length === 0 ? (
                                                <MenuItem value="" disabled>
                                                    Add an investment bucket on Assets first
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
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : (editingLiability ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Liabilities;