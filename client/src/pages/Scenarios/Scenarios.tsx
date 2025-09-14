import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Slider,
    Chip,
    IconButton,
    Fab,
    Alert,
    CircularProgress,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Timeline as TimelineIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Compare as CompareIcon,
    Save as SaveIcon,
    PlayArrow as PlayIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, useAppDispatch, useAppSelector } from '../../store/store';

interface Scenario {
    id: string;
    name: string;
    description: string;
    market_condition: 'bull' | 'bear' | 'crash' | 'recession' | 'normal';
    inflation_rate: number;
    income_growth_rate: number;
    investment_return_rate: number;
    time_horizon: number;
    created_at: string;
    updated_at: string;
}

interface ScenarioFormData {
    name: string;
    description: string;
    market_condition: string;
    inflation_rate: number;
    income_growth_rate: number;
    investment_return_rate: number;
    time_horizon: number;
}

const Scenarios: React.FC = () => {
    const dispatch = useAppDispatch();
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<ScenarioFormData>({
        name: '',
        description: '',
        market_condition: 'normal',
        inflation_rate: 2.5,
        income_growth_rate: 3.0,
        investment_return_rate: 7.0,
        time_horizon: 10,
    });

    // Sample projection data for charts
    const [projectionData, setProjectionData] = useState([
        { year: 0, conservative: 100000, moderate: 100000, aggressive: 100000 },
        { year: 1, conservative: 105000, moderate: 107000, aggressive: 110000 },
        { year: 2, conservative: 110250, moderate: 114490, aggressive: 121000 },
        { year: 3, conservative: 115763, moderate: 122504, aggressive: 133100 },
        { year: 4, conservative: 121551, moderate: 131079, aggressive: 146410 },
        { year: 5, conservative: 127628, moderate: 140255, aggressive: 161051 },
    ]);

    const marketConditions = [
        { value: 'normal', label: 'Normal Market', color: '#1976d2', description: 'Historical average returns' },
        { value: 'bull', label: 'Bull Market', color: '#2e7d32', description: 'Above-average returns' },
        { value: 'bear', label: 'Bear Market', color: '#d32f2f', description: 'Below-average returns' },
        { value: 'crash', label: 'Market Crash', color: '#f57c00', description: 'Significant losses' },
        { value: 'recession', label: 'Recession', color: '#7b1fa2', description: 'Economic downturn' },
    ];

    useEffect(() => {
        fetchScenarios();
    }, []);

    const fetchScenarios = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/scenarios');
            const data = await response.json();
            if (data.success) {
                setScenarios(data.data);
            } else {
                setError(data.error?.message || 'Failed to fetch scenarios');
            }
        } catch (err) {
            setError('Failed to fetch scenarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateScenario = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                setScenarios([...scenarios, data.data]);
                setOpenDialog(false);
                resetForm();
            } else {
                setError(data.error?.message || 'Failed to create scenario');
            }
        } catch (err) {
            setError('Failed to create scenario');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScenario = async () => {
        if (!editingScenario) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/scenarios/${editingScenario.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                setScenarios(scenarios.map(s => s.id === editingScenario.id ? data.data : s));
                setOpenDialog(false);
                setEditingScenario(null);
                resetForm();
            } else {
                setError(data.error?.message || 'Failed to update scenario');
            }
        } catch (err) {
            setError('Failed to update scenario');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteScenario = async (id: string) => {
        if (!confirm('Are you sure you want to delete this scenario?')) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/scenarios/${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                setScenarios(scenarios.filter(s => s.id !== id));
            } else {
                setError(data.error?.message || 'Failed to delete scenario');
            }
        } catch (err) {
            setError('Failed to delete scenario');
        } finally {
            setLoading(false);
        }
    };

    const handleRunScenario = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/scenarios/${id}/calculate`, {
                method: 'POST',
            });
            const data = await response.json();
            if (data.success) {
                // Update projection data with results
                setProjectionData(data.data.projections || projectionData);
            } else {
                setError(data.error?.message || 'Failed to run scenario');
            }
        } catch (err) {
            setError('Failed to run scenario');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            market_condition: 'normal',
            inflation_rate: 2.5,
            income_growth_rate: 3.0,
            investment_return_rate: 7.0,
            time_horizon: 10,
        });
    };

    const openCreateDialog = () => {
        resetForm();
        setEditingScenario(null);
        setOpenDialog(true);
    };

    const openEditDialog = (scenario: Scenario) => {
        setFormData({
            name: scenario.name,
            description: scenario.description,
            market_condition: scenario.market_condition,
            inflation_rate: scenario.inflation_rate,
            income_growth_rate: scenario.income_growth_rate,
            investment_return_rate: scenario.investment_return_rate,
            time_horizon: scenario.time_horizon,
        });
        setEditingScenario(scenario);
        setOpenDialog(true);
    };

    const handleScenarioSelection = (id: string) => {
        setSelectedScenarios(prev => 
            prev.includes(id) 
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    const getMarketConditionColor = (condition: string) => {
        return marketConditions.find(mc => mc.value === condition)?.color || '#1976d2';
    };

    if (loading && scenarios.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    Scenario Modeling
                </Typography>
                <Box>
                    <Button
                        variant="outlined"
                        startIcon={<CompareIcon />}
                        disabled={selectedScenarios.length < 2}
                        sx={{ mr: 2 }}
                    >
                        Compare Scenarios ({selectedScenarios.length})
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openCreateDialog}
                    >
                        New Scenario
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
                <Tab label="Scenarios" icon={<TimelineIcon />} />
                <Tab label="Projections" icon={<TrendingUpIcon />} />
                <Tab label="Comparison" icon={<CompareIcon />} />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={3}>
                    {scenarios.map((scenario) => (
                        <Grid item xs={12} md={6} lg={4} key={scenario.id}>
                            <Card 
                                sx={{ 
                                    cursor: 'pointer',
                                    border: selectedScenarios.includes(scenario.id) ? 2 : 1,
                                    borderColor: selectedScenarios.includes(scenario.id) ? 'primary.main' : 'divider',
                                }}
                                onClick={() => handleScenarioSelection(scenario.id)}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                                        <Typography variant="h6" component="div">
                                            {scenario.name}
                                        </Typography>
                                        <Box>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditDialog(scenario);
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteScenario(scenario.id);
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {scenario.description}
                                    </Typography>

                                    <Chip
                                        label={marketConditions.find(mc => mc.value === scenario.market_condition)?.label}
                                        size="small"
                                        sx={{ 
                                            backgroundColor: getMarketConditionColor(scenario.market_condition),
                                            color: 'white',
                                            mb: 2
                                        }}
                                    />

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {scenario.time_horizon} years
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<PlayIcon />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRunScenario(scenario.id);
                                            }}
                                        >
                                            Run
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {activeTab === 1 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Financial Projections
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={projectionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                            <Legend />
                            <Line type="monotone" dataKey="conservative" stroke="#1976d2" strokeWidth={2} name="Conservative" />
                            <Line type="monotone" dataKey="moderate" stroke="#2e7d32" strokeWidth={2} name="Moderate" />
                            <Line type="monotone" dataKey="aggressive" stroke="#d32f2f" strokeWidth={2} name="Aggressive" />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            {activeTab === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Scenario Comparison
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Select scenarios from the Scenarios tab to compare them side-by-side.
                    </Typography>
                </Paper>
            )}

            {/* Create/Edit Scenario Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingScenario ? 'Edit Scenario' : 'Create New Scenario'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Scenario Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Market Condition</InputLabel>
                                <Select
                                    value={formData.market_condition}
                                    onChange={(e) => setFormData({ ...formData, market_condition: e.target.value })}
                                >
                                    {marketConditions.map((condition) => (
                                        <MenuItem key={condition.value} value={condition.value}>
                                            <Box display="flex" alignItems="center">
                                                <Box
                                                    width={12}
                                                    height={12}
                                                    borderRadius="50%"
                                                    bgcolor={condition.color}
                                                    mr={1}
                                                />
                                                {condition.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Time Horizon (years)"
                                type="number"
                                value={formData.time_horizon}
                                onChange={(e) => setFormData({ ...formData, time_horizon: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>Inflation Rate: {formData.inflation_rate}%</Typography>
                            <Slider
                                value={formData.inflation_rate}
                                onChange={(_, value) => setFormData({ ...formData, inflation_rate: value as number })}
                                min={0}
                                max={10}
                                step={0.1}
                                marks={[
                                    { value: 0, label: '0%' },
                                    { value: 5, label: '5%' },
                                    { value: 10, label: '10%' },
                                ]}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>Income Growth: {formData.income_growth_rate}%</Typography>
                            <Slider
                                value={formData.income_growth_rate}
                                onChange={(_, value) => setFormData({ ...formData, income_growth_rate: value as number })}
                                min={-5}
                                max={15}
                                step={0.5}
                                marks={[
                                    { value: -5, label: '-5%' },
                                    { value: 5, label: '5%' },
                                    { value: 15, label: '15%' },
                                ]}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography gutterBottom>Investment Return: {formData.investment_return_rate}%</Typography>
                            <Slider
                                value={formData.investment_return_rate}
                                onChange={(_, value) => setFormData({ ...formData, investment_return_rate: value as number })}
                                min={-10}
                                max={20}
                                step={0.5}
                                marks={[
                                    { value: -10, label: '-10%' },
                                    { value: 5, label: '5%' },
                                    { value: 20, label: '20%' },
                                ]}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={editingScenario ? handleUpdateScenario : handleCreateScenario}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : (editingScenario ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Scenarios;
