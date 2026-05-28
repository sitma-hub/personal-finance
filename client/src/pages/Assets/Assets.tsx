import React, { useState } from 'react';
import {
    Box,
    Button,
    Grid,
    IconButton,
    Chip,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountBalance,
} from '@mui/icons-material';
import { useFinancial } from '../../contexts/FinancialContext';
import { Asset, AssetFormData, AssetType, INVESTABLE_ASSET_TYPES } from '../../types';
import { assetService } from '../../services/assetService';
import { formatLocaleDate, formatLocaleMonth } from '../../utils/dateInput';
import { formatCurrency } from '../../utils/currency';
import { AssetValueHistory } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveDataView, type ResponsiveColumn } from '../../components/ui/ResponsiveDataView';

const assetTypes: { value: AssetType; label: string }[] = [
    { value: 'savings_account', label: 'Savings Account' },
    { value: 'checking_account', label: 'Checking Account' },
    { value: 'investment_account', label: 'Investment Account' },
    { value: 'retirement_account', label: 'Retirement Account' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'other_asset', label: 'Other Asset' },
];

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isInvestableType = (type: AssetType) => INVESTABLE_ASSET_TYPES.includes(type);

const investableDefaults = (): Partial<AssetFormData> => ({
    monthly_contribution: 0,
    expected_annual_return: 0.07,
    pessimistic_annual_return: 0.04,
    optimistic_annual_return: 0.1,
    include_in_projection: true,
});

const toFormRates = (asset: Asset): Partial<AssetFormData> => ({
    monthly_contribution: Number(asset.monthly_contribution ?? 0),
    expected_annual_return: asset.expected_annual_return != null ? Number(asset.expected_annual_return) : undefined,
    pessimistic_annual_return: asset.pessimistic_annual_return != null ? Number(asset.pessimistic_annual_return) : undefined,
    optimistic_annual_return: asset.optimistic_annual_return != null ? Number(asset.optimistic_annual_return) : undefined,
    include_in_projection: asset.include_in_projection !== false,
});

const Assets: React.FC = () => {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const { state, createAsset, updateAsset, deleteAsset } = useFinancial();
    const { assets, loading, error } = state;

    const [openDialog, setOpenDialog] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [history, setHistory] = useState<Record<string, AssetValueHistory[]>>({});
    const [formData, setFormData] = useState<AssetFormData>({
        name: '',
        type: 'savings_account',
        current_value: 0,
        as_of_date: currentMonth(),
        notes: '',
    });

    const parseValue = (v: number | string) =>
        typeof v === 'string' ? parseFloat(v) : v;

    const handleOpenDialog = (asset?: Asset) => {
        if (asset) {
            setEditingAsset(asset);
            setFormData({
                name: asset.name,
                type: asset.type,
                current_value: parseValue(asset.current_value),
                as_of_date: asset.as_of_date?.substring(0, 7) || currentMonth(),
                purchase_date: asset.purchase_date,
                purchase_price: asset.purchase_price,
                notes: asset.notes || '',
                ...toFormRates(asset),
            });
        } else {
            setEditingAsset(null);
            setFormData({
                name: '',
                type: 'investment_account',
                current_value: 0,
                as_of_date: currentMonth(),
                notes: '',
                ...investableDefaults(),
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingAsset(null);
    };

    const handleSubmit = async () => {
        if (editingAsset) {
            await updateAsset(editingAsset.id, formData);
        } else {
            await createAsset(formData);
        }
        handleCloseDialog();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Delete this asset?')) {
            await deleteAsset(id);
        }
    };

    const toggleHistory = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        if (!history[id]) {
            const res = await assetService.getValueHistory(id);
            setHistory((prev) => ({ ...prev, [id]: res.data || [] }));
        }
    };

    const totalValue = assets.reduce(
        (sum, asset) => sum + (parseValue(asset.current_value) || 0),
        0
    );

    if (loading && assets.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <PageHeader
                title="Assets"
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                        Add Asset
                    </Button>
                }
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard
                        icon={<AccountBalance color="primary" />}
                        label="Total Assets"
                        value={formatCurrency(totalValue)}
                        sx={{ height: '100%' }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard label="Count" value={assets.length} sx={{ height: '100%' }} />
                </Grid>
            </Grid>

            {(() => {
                const columns: ResponsiveColumn<Asset>[] = [
                    { id: 'name', label: 'Name', render: (a) => a.name },
                    {
                        id: 'type',
                        label: 'Type',
                        render: (a) => (
                            <Chip
                                label={assetTypes.find((t) => t.value === a.type)?.label}
                                size="small"
                                variant="outlined"
                            />
                        ),
                    },
                    {
                        id: 'value',
                        label: 'Value',
                        align: 'right',
                        render: (a) => formatCurrency(parseValue(a.current_value)),
                    },
                    { id: 'asOf', label: 'As of', render: (a) => formatLocaleMonth(a.as_of_date) },
                    {
                        id: 'plan',
                        label: '€/mo plan',
                        align: 'right',
                        render: (a) =>
                            isInvestableType(a.type) && Number(a.monthly_contribution) > 0
                                ? formatCurrency(Number(a.monthly_contribution))
                                : '—',
                    },
                ];

                return (
                    <ResponsiveDataView
                        rows={assets}
                        getRowId={(a) => a.id}
                        columns={columns}
                        mobilePrimary={(a) => a.name}
                        actions={(a) => (
                            <>
                                <IconButton size="small" onClick={() => handleOpenDialog(a)} aria-label="Edit asset">
                                    <EditIcon />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(a.id)}
                                    aria-label="Delete asset"
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </>
                        )}
                        renderExpanded={(a) => (
                            <Box sx={{ py: 0.5 }}>
                                {(history[a.id] || []).length === 0 ? (
                                    <Button size="small" onClick={() => toggleHistory(a.id)}>
                                        Load value history
                                    </Button>
                                ) : (
                                    <>
                                        {history[a.id].map((h) => (
                                            <Box
                                                key={h.id}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    gap: 2,
                                                    py: 0.25,
                                                }}
                                            >
                                                <Box sx={{ color: 'text.secondary', fontSize: 12 }}>
                                                    {formatLocaleDate(h.as_of_date)}
                                                </Box>
                                                <Box sx={{ fontSize: 13 }}>
                                                    {formatCurrency(parseValue(h.value))}
                                                </Box>
                                            </Box>
                                        ))}
                                    </>
                                )}
                            </Box>
                        )}
                        isRowExpanded={(a) => expandedId === a.id}
                        onToggleRowExpanded={(a) => {
                            void toggleHistory(a.id);
                        }}
                    />
                );
            })()}

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
                fullScreen={fullScreenDialog}
            >
                <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Name" value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        margin="normal" required />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={formData.type}
                            onChange={(e) => {
                                const type = e.target.value as AssetType;
                                setFormData({
                                    ...formData,
                                    type,
                                    ...(isInvestableType(type) && !isInvestableType(formData.type)
                                        ? investableDefaults()
                                        : {}),
                                });
                            }}
                        >
                            {assetTypes.map((t) => (
                                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField fullWidth label="Current value" type="number"
                        value={formData.current_value}
                        onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                        margin="normal" required />
                    <TextField fullWidth label="As of (YYYY-MM)" value={formData.as_of_date || ''}
                        onChange={(e) => setFormData({ ...formData, as_of_date: e.target.value })}
                        margin="normal" placeholder="2026-05" helperText="Month this value applies to" />
                    {isInvestableType(formData.type) && (
                        <>
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Update current value when you get a statement. Monthly contribution is your plan (not an expense).
                            </Alert>
                            <TextField
                                fullWidth
                                label="Monthly contribution (€)"
                                type="number"
                                value={formData.monthly_contribution ?? 0}
                                onChange={(e) => setFormData({ ...formData, monthly_contribution: parseFloat(e.target.value) || 0 })}
                                margin="normal"
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth
                                        label="Pessimistic %/yr"
                                        type="number"
                                        value={((formData.pessimistic_annual_return ?? 0.04) * 100).toFixed(1)}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pessimistic_annual_return: (parseFloat(e.target.value) || 0) / 100,
                                        })}
                                        margin="normal"
                                        inputProps={{ step: 0.1 }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth
                                        label="Expected %/yr"
                                        type="number"
                                        value={((formData.expected_annual_return ?? 0.07) * 100).toFixed(1)}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            expected_annual_return: (parseFloat(e.target.value) || 0) / 100,
                                        })}
                                        margin="normal"
                                        inputProps={{ step: 0.1 }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        fullWidth
                                        label="Optimistic %/yr"
                                        type="number"
                                        value={((formData.optimistic_annual_return ?? 0.1) * 100).toFixed(1)}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            optimistic_annual_return: (parseFloat(e.target.value) || 0) / 100,
                                        })}
                                        margin="normal"
                                        inputProps={{ step: 0.1 }}
                                    />
                                </Grid>
                            </Grid>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.include_in_projection !== false}
                                        onChange={(e) => setFormData({ ...formData, include_in_projection: e.target.checked })}
                                    />
                                }
                                label="Include in investment forecast"
                            />
                        </>
                    )}
                    <TextField fullWidth label="Notes" multiline rows={2} value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })} margin="normal" />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
