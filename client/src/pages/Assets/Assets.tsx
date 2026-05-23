import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
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
    Collapse,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountBalance,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useFinancial } from '../../contexts/FinancialContext';
import { Asset, AssetFormData, AssetType, INVESTABLE_ASSET_TYPES } from '../../types';
import { assetService } from '../../services/assetService';
import { formatCurrency } from '../../utils/currency';
import { AssetValueHistory } from '../../types';

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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Assets</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
                    Add Asset
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <AccountBalance color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" variant="body2">Total Assets</Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(totalValue)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">Count</Typography>
                            <Typography variant="h5">{assets.length}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width={40} />
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Value</TableCell>
                            <TableCell>As of</TableCell>
                            <TableCell align="right">€/mo plan</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assets.map((asset) => (
                            <React.Fragment key={asset.id}>
                                <TableRow>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => toggleHistory(asset.id)}>
                                            {expandedId === asset.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{asset.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={assetTypes.find((t) => t.value === asset.type)?.label}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatCurrency(parseValue(asset.current_value))}
                                    </TableCell>
                                    <TableCell>
                                        {asset.as_of_date?.substring(0, 7) || '—'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {isInvestableType(asset.type) && Number(asset.monthly_contribution) > 0
                                            ? formatCurrency(Number(asset.monthly_contribution))
                                            : '—'}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleOpenDialog(asset)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(asset.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ py: 0 }}>
                                        <Collapse in={expandedId === asset.id}>
                                            <Box sx={{ py: 2, pl: 6 }}>
                                                <Typography variant="subtitle2" gutterBottom>Value history</Typography>
                                                {(history[asset.id] || []).length === 0 ? (
                                                    <Typography variant="body2" color="textSecondary">No history yet</Typography>
                                                ) : (
                                                    history[asset.id].map((h) => (
                                                        <Typography key={h.id} variant="body2">
                                                            {h.as_of_date?.substring(0, 10)} — {formatCurrency(parseValue(h.value))}
                                                        </Typography>
                                                    ))
                                                )}
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
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
