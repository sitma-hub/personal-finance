import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AccountBalance,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, useAppDispatch, useAppSelector } from '../../store/store';
import { fetchAssets, createAsset, updateAsset, deleteAsset } from '../../store/slices/assetsSlice';
import { Asset, AssetFormData, AssetType } from '../../types';

const Assets: React.FC = () => {
    const dispatch = useAppDispatch();
    const { assets, loading, error } = useAppSelector((state) => state.assets);

    const [openDialog, setOpenDialog] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [formData, setFormData] = useState<AssetFormData>({
        name: '',
        type: 'savings_account',
        current_value: 0,
        monthly_contribution: 0,
        notes: '',
    });

    useEffect(() => {
        dispatch(fetchAssets());
    }, [dispatch]);

    const handleOpenDialog = (asset?: Asset) => {
        if (asset) {
            setEditingAsset(asset);
            setFormData({
                name: asset.name,
                type: asset.type,
                current_value: asset.current_value,
                purchase_date: asset.purchase_date,
                purchase_price: asset.purchase_price,
                annual_return_rate: asset.annual_return_rate,
                monthly_contribution: asset.monthly_contribution,
                notes: asset.notes || '',
            });
        } else {
            setEditingAsset(null);
            setFormData({
                name: '',
                type: 'savings_account',
                current_value: 0,
                monthly_contribution: 0,
                notes: '',
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingAsset(null);
    };

    const handleSubmit = () => {
        if (editingAsset) {
            dispatch(updateAsset({ id: editingAsset.id, data: formData }));
        } else {
            dispatch(createAsset(formData));
        }
        handleCloseDialog();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this asset?')) {
            dispatch(deleteAsset(id));
        }
    };

    const assetTypes: { value: AssetType; label: string }[] = [
        { value: 'savings_account', label: 'Savings Account' },
        { value: 'checking_account', label: 'Checking Account' },
        { value: 'investment_account', label: 'Investment Account' },
        { value: 'retirement_account', label: 'Retirement Account' },
        { value: 'real_estate', label: 'Real Estate' },
        { value: 'vehicle', label: 'Vehicle' },
        { value: 'other_asset', label: 'Other Asset' },
    ];

    const totalValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);

    if (loading) {
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
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Add Asset
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} mb={3}>
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
                                        ${totalValue.toLocaleString()}
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
                                <AccountBalance color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Asset Count
                                    </Typography>
                                    <Typography variant="h5">
                                        {assets.length}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Assets Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell align="right">Current Value</TableCell>
                            <TableCell align="right">Monthly Contribution</TableCell>
                            <TableCell align="right">Return Rate</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assets.map((asset) => (
                            <TableRow key={asset.id}>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body1" fontWeight="medium">
                                            {asset.name}
                                        </Typography>
                                        {asset.notes && (
                                            <Typography variant="body2" color="textSecondary">
                                                {asset.notes}
                                            </Typography>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={assetTypes.find(t => t.value === asset.type)?.label || asset.type}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    ${asset.current_value.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                    ${asset.monthly_contribution.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                    {asset.annual_return_rate ? `${(asset.annual_return_rate * 100).toFixed(2)}%` : 'N/A'}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpenDialog(asset)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(asset.id)}
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

            {/* Add/Edit Asset Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField
                            fullWidth
                            label="Asset Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            margin="normal"
                            required
                        />

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Asset Type</InputLabel>
                            <Select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
                            >
                                {assetTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Current Value"
                            type="number"
                            value={formData.current_value}
                            onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                            margin="normal"
                            required
                        />

                        <TextField
                            fullWidth
                            label="Monthly Contribution"
                            type="number"
                            value={formData.monthly_contribution}
                            onChange={(e) => setFormData({ ...formData, monthly_contribution: parseFloat(e.target.value) || 0 })}
                            margin="normal"
                        />

                        <TextField
                            fullWidth
                            label="Annual Return Rate (%)"
                            type="number"
                            value={formData.annual_return_rate ? formData.annual_return_rate * 100 : ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                annual_return_rate: parseFloat(e.target.value) ? parseFloat(e.target.value) / 100 : undefined
                            })}
                            margin="normal"
                        />

                        <TextField
                            fullWidth
                            label="Purchase Date"
                            type="date"
                            value={formData.purchase_date || ''}
                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            fullWidth
                            label="Purchase Price"
                            type="number"
                            value={formData.purchase_price || ''}
                            onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || undefined })}
                            margin="normal"
                        />

                        <TextField
                            fullWidth
                            label="Notes"
                            multiline
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            margin="normal"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingAsset ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
