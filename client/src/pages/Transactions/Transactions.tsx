import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Autocomplete,
    useMediaQuery,
    Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Receipt as ReceiptIcon,
    UploadFile as UploadFileIcon,
    TrendingUp as InflowIcon,
    TrendingDown as OutflowIcon,
    AccountBalanceWallet as NetIcon,
} from '@mui/icons-material';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    Transaction,
    TransactionFormData,
    TransactionDirection,
    MonthlyActualSummary,
} from '../../types';
import { transactionService } from '../../services/transactionService';
import { useFinancial } from '../../contexts/FinancialContext';
import { formatCurrency } from '../../utils/currency';
import { formatLocaleDate, currentMonth } from '../../utils/dateInput';
import { parseCsvWithHeader, parseNumberLoose } from '../../utils/csv';
import { GlassSurface } from '../../components/ui/GlassSurface';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';

const DEFAULT_CATEGORIES = [
    'Housing', 'Transportation', 'Food & Dining', 'Healthcare', 'Education',
    'Entertainment', 'Utilities', 'Insurance', 'Personal Care', 'Shopping',
    'Travel', 'Salary', 'Investment', 'Transfer', 'Other',
];

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): TransactionFormData => ({
    txn_date: todayIso(),
    amount: 0,
    direction: 'outflow',
    category: '',
    account_id: '',
    description: '',
    notes: '',
});

type DirectionStrategy = 'sign' | 'inflow' | 'outflow' | 'column';

const Transactions: React.FC = () => {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const { state } = useFinancial();
    const { assets } = state;

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<MonthlyActualSummary | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snack, setSnack] = useState<string | null>(null);

    const [monthFilter, setMonthFilter] = useState<string>(currentMonth());
    const [directionFilter, setDirectionFilter] = useState<'' | TransactionDirection>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    const [openDialog, setOpenDialog] = useState(false);
    const [editing, setEditing] = useState<Transaction | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    const { control, handleSubmit, reset, formState: { errors, isSubmitting } } =
        useForm<TransactionFormData>({ defaultValues: emptyForm() });

    const accountNameById = useMemo(() => {
        const map = new Map<string, string>();
        assets.forEach((a) => map.set(a.id, a.name));
        return map;
    }, [assets]);

    const categoryOptions = useMemo(() => {
        const set = new Set<string>([...DEFAULT_CATEGORIES, ...categories]);
        return Array.from(set).sort();
    }, [categories]);

    const monthRange = useMemo(() => {
        if (!/^\d{4}-\d{2}$/.test(monthFilter)) return { from: undefined, to: undefined };
        const [y, m] = monthFilter.split('-').map(Number);
        const from = `${monthFilter}-01`;
        const lastDay = new Date(y!, m!, 0).getDate();
        const to = `${monthFilter}-${String(lastDay).padStart(2, '0')}`;
        return { from, to };
    }, [monthFilter]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [txnRes, summaryRes, catRes] = await Promise.all([
                transactionService.getAll({
                    from: monthRange.from,
                    to: monthRange.to,
                    direction: directionFilter || undefined,
                    category: categoryFilter || undefined,
                }),
                transactionService.getMonthlySummary(monthFilter),
                transactionService.getCategories(),
            ]);
            setTransactions(Array.isArray(txnRes.data) ? txnRes.data : []);
            setSummary(summaryRes.data ?? null);
            setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    }, [monthRange.from, monthRange.to, monthFilter, directionFilter, categoryFilter]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleOpenAdd = () => {
        setEditing(null);
        reset(emptyForm());
        setOpenDialog(true);
    };

    const handleEdit = (txn: Transaction) => {
        setEditing(txn);
        reset({
            txn_date: txn.txn_date?.slice(0, 10) || todayIso(),
            amount: Number(txn.amount),
            direction: txn.direction,
            category: txn.category,
            account_id: txn.account_id ?? '',
            description: txn.description ?? '',
            notes: txn.notes ?? '',
        });
        setOpenDialog(true);
    };

    const handleClose = () => {
        setOpenDialog(false);
        setEditing(null);
    };

    const onSubmit = async (data: TransactionFormData) => {
        const payload: TransactionFormData = {
            ...data,
            amount: Math.abs(Number(data.amount)),
            account_id: data.account_id ? data.account_id : null,
        };
        try {
            if (editing) {
                await transactionService.update(editing.id, payload);
                setSnack(t('pages.transactions.snack.updated'));
            } else {
                await transactionService.create(payload);
                setSnack(t('pages.transactions.snack.created'));
            }
            handleClose();
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save transaction');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('pages.transactions.confirmDelete'))) return;
        try {
            await transactionService.delete(id);
            setSnack(t('pages.transactions.snack.deleted'));
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete transaction');
        }
    };

    return (
        <Box>
            <PageHeader
                icon={<ReceiptIcon color="primary" />}
                title={t('pages.transactions.title')}
                actions={
                    <>
                        <Button
                            variant="outlined"
                            startIcon={<UploadFileIcon />}
                            onClick={() => setImportOpen(true)}
                        >
                            {t('pages.transactions.import.button')}
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
                            {t('pages.transactions.addButton')}
                        </Button>
                    </>
                }
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('pages.transactions.subtitle')}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 1 }}>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        icon={<InflowIcon color="success" />}
                        label={t('pages.transactions.kpi.inflow')}
                        value={formatCurrency(summary?.actualInflow ?? 0)}
                        sx={{ height: '100%' }}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        icon={<OutflowIcon color="error" />}
                        label={t('pages.transactions.kpi.outflow')}
                        value={formatCurrency(summary?.actualOutflow ?? 0)}
                        sx={{ height: '100%' }}
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <StatCard
                        icon={<NetIcon color={(summary?.net ?? 0) >= 0 ? 'success' : 'error'} />}
                        label={t('pages.transactions.kpi.net')}
                        value={formatCurrency(summary?.net ?? 0)}
                        sx={{ height: '100%' }}
                    />
                </Grid>
            </Grid>

            <GlassSurface sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            size="small"
                            type="month"
                            label={t('pages.transactions.filters.month')}
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('pages.transactions.filters.direction')}</InputLabel>
                            <Select
                                value={directionFilter}
                                label={t('pages.transactions.filters.direction')}
                                onChange={(e) => setDirectionFilter(e.target.value as '' | TransactionDirection)}
                            >
                                <MenuItem value="">{t('pages.transactions.filters.all')}</MenuItem>
                                <MenuItem value="inflow">{t('pages.transactions.direction.inflow')}</MenuItem>
                                <MenuItem value="outflow">{t('pages.transactions.direction.outflow')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{t('pages.transactions.filters.category')}</InputLabel>
                            <Select
                                value={categoryFilter}
                                label={t('pages.transactions.filters.category')}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <MenuItem value="">{t('pages.transactions.filters.all')}</MenuItem>
                                {categoryOptions.map((c) => (
                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </GlassSurface>

            <GlassSurface sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {t('pages.transactions.table.title')}
                </Typography>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : transactions.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        {t('pages.transactions.table.empty')}
                    </Typography>
                ) : (
                    <ResponsiveDataView
                        rows={transactions}
                        getRowId={(r) => r.id}
                        mobilePrimary={(r) => r.description || r.category}
                        columns={
                            [
                                {
                                    id: 'date',
                                    label: t('pages.transactions.table.date'),
                                    render: (r) => formatLocaleDate(r.txn_date),
                                },
                                {
                                    id: 'description',
                                    label: t('pages.transactions.table.description'),
                                    render: (r) => r.description || '—',
                                },
                                {
                                    id: 'category',
                                    label: t('pages.transactions.table.category'),
                                    render: (r) => <Chip label={r.category} size="small" variant="outlined" />,
                                },
                                {
                                    id: 'account',
                                    label: t('pages.transactions.table.account'),
                                    render: (r) => (r.account_id ? accountNameById.get(r.account_id) || '—' : '—'),
                                    hideOnMobile: true,
                                },
                                {
                                    id: 'amount',
                                    label: t('pages.transactions.table.amount'),
                                    align: 'right',
                                    render: (r) => (
                                        <Typography
                                            component="span"
                                            sx={{
                                                color: r.direction === 'inflow'
                                                    ? theme.palette.success.main
                                                    : theme.palette.error.main,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {r.direction === 'inflow' ? '+' : '-'}
                                            {formatCurrency(Number(r.amount))}
                                        </Typography>
                                    ),
                                },
                            ] as ResponsiveColumn<Transaction>[]
                        }
                        actions={(r) => (
                            <>
                                <IconButton onClick={() => handleEdit(r)} size="small" aria-label="Edit transaction">
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => handleDelete(r.id)}
                                    size="small"
                                    color="error"
                                    aria-label="Delete transaction"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </>
                        )}
                    />
                )}
            </GlassSurface>

            <Dialog
                open={openDialog}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                fullScreen={fullScreenDialog}
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogTitle>
                        {editing ? t('pages.transactions.form.editTitle') : t('pages.transactions.form.addTitle')}
                    </DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="txn_date"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="date"
                                            label={t('pages.transactions.form.date')}
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.txn_date}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="direction"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>{t('pages.transactions.form.direction')}</InputLabel>
                                            <Select {...field} label={t('pages.transactions.form.direction')}>
                                                <MenuItem value="outflow">{t('pages.transactions.direction.outflow')}</MenuItem>
                                                <MenuItem value="inflow">{t('pages.transactions.direction.inflow')}</MenuItem>
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="amount"
                                    control={control}
                                    rules={{ required: true, min: 0 }}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            type="number"
                                            label={t('pages.transactions.form.amount')}
                                            inputProps={{ step: 0.01, min: 0 }}
                                            error={!!errors.amount}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="category"
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <Autocomplete
                                            freeSolo
                                            options={categoryOptions}
                                            value={field.value || ''}
                                            onChange={(_, val) => field.onChange(val ?? '')}
                                            onInputChange={(_, val) => field.onChange(val)}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label={t('pages.transactions.form.category')}
                                                    error={!!errors.category}
                                                />
                                            )}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Controller
                                    name="account_id"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControl fullWidth>
                                            <InputLabel>{t('pages.transactions.form.account')}</InputLabel>
                                            <Select
                                                {...field}
                                                value={field.value ?? ''}
                                                label={t('pages.transactions.form.account')}
                                            >
                                                <MenuItem value="">{t('pages.transactions.form.noAccount')}</MenuItem>
                                                {assets.map((a) => (
                                                    <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            label={t('pages.transactions.form.description')}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            fullWidth
                                            multiline
                                            rows={2}
                                            label={t('pages.transactions.form.notes')}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>{t('common.cancel')}</Button>
                        <Button type="submit" variant="contained" disabled={isSubmitting}>
                            {isSubmitting ? <CircularProgress size={20} /> : (editing ? t('common.update') : t('common.create'))}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ImportDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
                onImported={(count) => {
                    setSnack(t('pages.transactions.import.success', { count }));
                    void loadData();
                }}
                categoryOptions={categoryOptions}
            />

            <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack} />
        </Box>
    );
};

interface ImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImported: (count: number) => void;
    categoryOptions: string[];
}

const NONE = '__none__';

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImported, categoryOptions }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<string[][]>([]);
    const [dateCol, setDateCol] = useState<string>('');
    const [amountCol, setAmountCol] = useState<string>('');
    const [descCol, setDescCol] = useState<string>(NONE);
    const [categoryCol, setCategoryCol] = useState<string>(NONE);
    const [defaultCategory, setDefaultCategory] = useState<string>('Other');
    const [dirStrategy, setDirStrategy] = useState<DirectionStrategy>('sign');
    const [directionCol, setDirectionCol] = useState<string>('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const resetState = () => {
        setHeaders([]);
        setRows([]);
        setDateCol('');
        setAmountCol('');
        setDescCol(NONE);
        setCategoryCol(NONE);
        setDirStrategy('sign');
        setDirectionCol('');
        setImportError(null);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFile = async (file: File) => {
        const text = await file.text();
        const parsed = parseCsvWithHeader(text);
        if (parsed.headers.length === 0) {
            setImportError(t('pages.transactions.import.errors.empty'));
            return;
        }
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setImportError(null);
        // Best-effort auto-detection
        const lower = parsed.headers.map((h) => h.toLowerCase());
        const findCol = (...keys: string[]) =>
            parsed.headers[lower.findIndex((h) => keys.some((k) => h.includes(k)))] ?? '';
        setDateCol(findCol('date', 'datum'));
        setAmountCol(findCol('amount', 'betrag', 'value', 'sum'));
        const desc = findCol('description', 'desc', 'memo', 'payee', 'verwendung', 'name');
        setDescCol(desc || NONE);
        const cat = findCol('category', 'kategorie');
        setCategoryCol(cat || NONE);
    };

    const colIndex = (header: string) => headers.indexOf(header);

    const buildRows = (): TransactionFormData[] => {
        const di = colIndex(dateCol);
        const ai = colIndex(amountCol);
        const dei = descCol !== NONE ? colIndex(descCol) : -1;
        const ci = categoryCol !== NONE ? colIndex(categoryCol) : -1;
        const dri = dirStrategy === 'column' ? colIndex(directionCol) : -1;

        const result: TransactionFormData[] = [];
        for (const row of rows) {
            const rawDate = (row[di] ?? '').trim();
            const rawAmount = (row[ai] ?? '').trim();
            if (!rawDate || !rawAmount) continue;

            const num = parseNumberLoose(rawAmount);
            if (Number.isNaN(num)) continue;

            let direction: TransactionDirection;
            if (dirStrategy === 'inflow') direction = 'inflow';
            else if (dirStrategy === 'outflow') direction = 'outflow';
            else if (dirStrategy === 'column') {
                const v = (row[dri] ?? '').toLowerCase();
                direction = /in|credit|deposit|haben|\+/.test(v) ? 'inflow' : 'outflow';
            } else {
                direction = num >= 0 ? 'inflow' : 'outflow';
            }

            const isoDate = normalizeImportedDate(rawDate);
            if (!isoDate) continue;

            result.push({
                txn_date: isoDate,
                amount: Math.abs(num),
                direction,
                category: ci >= 0 ? (row[ci]?.trim() || defaultCategory) : defaultCategory,
                description: dei >= 0 ? (row[dei]?.trim() || '') : '',
                source: 'import',
            } as TransactionFormData);
        }
        return result;
    };

    const previewRows = useMemo(() => {
        if (!dateCol || !amountCol) return [];
        try {
            return buildRows();
        } catch {
            return [];
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateCol, amountCol, descCol, categoryCol, defaultCategory, dirStrategy, directionCol, rows]);

    const handleImport = async () => {
        const toImport = buildRows();
        if (toImport.length === 0) {
            setImportError(t('pages.transactions.import.errors.noValidRows'));
            return;
        }
        setImporting(true);
        setImportError(null);
        try {
            const res = await transactionService.importMany(toImport);
            onImported(res.data?.imported ?? toImport.length);
            handleClose();
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const colSelect = (
        label: string,
        value: string,
        onChange: (v: string) => void,
        allowNone = false
    ) => (
        <FormControl fullWidth size="small">
            <InputLabel>{label}</InputLabel>
            <Select value={value} label={label} onChange={(e) => onChange(e.target.value)}>
                {allowNone && <MenuItem value={NONE}>{t('pages.transactions.import.mapping.none')}</MenuItem>}
                {headers.map((h, i) => (
                    <MenuItem key={`${h}-${i}`} value={h}>{h || `Column ${i + 1}`}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
            <DialogTitle>{t('pages.transactions.import.title')}</DialogTitle>
            <DialogContent>
                {importError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImportError(null)}>
                        {importError}
                    </Alert>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = '';
                    }}
                />

                <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ mb: 2 }}
                >
                    {t('pages.transactions.import.chooseFile')}
                </Button>

                {headers.length > 0 && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            {t('pages.transactions.import.mapping.title', { count: rows.length })}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                {colSelect(t('pages.transactions.import.mapping.date'), dateCol, setDateCol)}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {colSelect(t('pages.transactions.import.mapping.amount'), amountCol, setAmountCol)}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {colSelect(t('pages.transactions.import.mapping.description'), descCol, setDescCol, true)}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {colSelect(t('pages.transactions.import.mapping.category'), categoryCol, setCategoryCol, true)}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>{t('pages.transactions.import.mapping.directionStrategy')}</InputLabel>
                                    <Select
                                        value={dirStrategy}
                                        label={t('pages.transactions.import.mapping.directionStrategy')}
                                        onChange={(e) => setDirStrategy(e.target.value as DirectionStrategy)}
                                    >
                                        <MenuItem value="sign">{t('pages.transactions.import.mapping.dirSign')}</MenuItem>
                                        <MenuItem value="outflow">{t('pages.transactions.import.mapping.dirAllOut')}</MenuItem>
                                        <MenuItem value="inflow">{t('pages.transactions.import.mapping.dirAllIn')}</MenuItem>
                                        <MenuItem value="column">{t('pages.transactions.import.mapping.dirColumn')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            {dirStrategy === 'column' && (
                                <Grid item xs={12} sm={6}>
                                    {colSelect(t('pages.transactions.import.mapping.directionColumn'), directionCol, setDirectionCol)}
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <Autocomplete
                                    freeSolo
                                    size="small"
                                    options={categoryOptions}
                                    value={defaultCategory}
                                    onChange={(_, val) => setDefaultCategory(val ?? 'Other')}
                                    onInputChange={(_, val) => setDefaultCategory(val)}
                                    renderInput={(params) => (
                                        <TextField {...params} label={t('pages.transactions.import.mapping.defaultCategory')} />
                                    )}
                                />
                            </Grid>
                        </Grid>

                        <Alert severity="info" sx={{ mt: 2 }}>
                            {t('pages.transactions.import.preview', { count: previewRows.length })}
                        </Alert>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>{t('common.cancel')}</Button>
                <Button
                    variant="contained"
                    onClick={handleImport}
                    disabled={importing || previewRows.length === 0}
                >
                    {importing ? <CircularProgress size={20} /> : t('pages.transactions.import.confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/** Accepts ISO (YYYY-MM-DD), DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY heuristically. Returns ISO or null. */
function normalizeImportedDate(value: string): string | null {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const dmY = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
    if (dmY) {
        const [, d, m, rawY] = dmY;
        const y = rawY!.length === 2 ? `20${rawY}` : rawY!;
        const day = Number(d);
        const month = Number(m);
        // If first group > 12 it must be a day; otherwise assume day-first (EU)
        const dd = String(day).padStart(2, '0');
        const mm = String(month).padStart(2, '0');
        if (month > 12 || day > 12) {
            // ambiguous resolved: ensure valid month
            if (month > 12) return `${y}-${dd}-${mm}`;
        }
        return `${y}-${mm}-${dd}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }
    return null;
}

export default Transactions;
