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
    Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, useAppDispatch, useAppSelector } from '../../store/store';
import MonteCarloSimulation from '../../components/MonteCarloSimulation/MonteCarloSimulation';

interface Scenario {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    type: 'market_conditions' | 'inflation' | 'income_growth' | 'life_events' | 'custom';
    parameters: {
        market_condition?: 'bull' | 'bear' | 'crash' | 'recession' | 'normal';
        inflation_rate?: number;
        income_growth_rate?: number;
        investment_return_rate?: number;
        market_return_rate?: number;
        expense_inflation_rate?: number;
    };
    time_horizon_years: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface ScenarioFormData {
    name: string;
    description: string;
    type: 'market_conditions' | 'inflation' | 'income_growth' | 'life_events' | 'custom';
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
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [scenarioResults, setScenarioResults] = useState<Record<string, any[]>>({});

    const [formData, setFormData] = useState<ScenarioFormData>({
        name: '',
        description: '',
        type: 'custom',
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
            const scenarioData = {
                name: formData.name,
                description: formData.description,
                type: formData.type,
                parameters: {
                    market_condition: formData.market_condition,
                    inflation_rate: formData.inflation_rate,
                    income_growth_rate: formData.income_growth_rate,
                    investment_return_rate: formData.investment_return_rate,
                },
                time_horizon_years: formData.time_horizon,
            };

            const response = await fetch('/api/scenarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioData),
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
            const scenarioData = {
                name: formData.name,
                description: formData.description,
                type: formData.type,
                parameters: {
                    market_condition: formData.market_condition,
                    inflation_rate: formData.inflation_rate,
                    income_growth_rate: formData.income_growth_rate,
                    investment_return_rate: formData.investment_return_rate,
                },
                time_horizon_years: formData.time_horizon,
            };

            const response = await fetch(`/api/scenarios/${editingScenario.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioData),
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
                // Store results for this scenario
                setScenarioResults(prev => ({
                    ...prev,
                    [id]: data.data
                }));

                // Update projection data with results for single scenario view
                if (data.data && data.data.length > 0) {
                    const chartData = data.data.map((result: any) => ({
                        year: result.year,
                        netWorth: result.net_worth,
                        assets: result.total_assets,
                        liabilities: result.total_liabilities,
                        income: result.monthly_income,
                        expenses: result.monthly_expenses,
                        savings: result.monthly_savings
                    }));
                    setProjectionData(chartData);
                }
            } else {
                setError(data.error?.message || 'Failed to run scenario');
            }
        } catch (err) {
            setError('Failed to run scenario');
        } finally {
            setLoading(false);
        }
    };

    const handleCompareScenarios = async () => {
        if (selectedScenarios.length < 2) return;

        setLoading(true);
        try {
            const comparisonPromises = selectedScenarios.map(async (scenarioId) => {
                const response = await fetch(`/api/scenarios/${scenarioId}/calculate`, {
                    method: 'POST',
                });
                const data = await response.json();
                if (data.success) {
                    return {
                        scenarioId,
                        scenarioName: scenarios.find(s => s.id === scenarioId)?.name || 'Unknown',
                        data: data.data
                    };
                }
                return null;
            });

            const results = await Promise.all(comparisonPromises);
            const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null);

            if (validResults.length >= 2) {
                // Prepare comparison data for charts
                const maxYears = Math.max(...validResults.map(r => r.data.length));
                const comparisonChartData = [];

                for (let year = 1; year <= maxYears; year++) {
                    const yearData: any = { year };
                    validResults.forEach(result => {
                        const yearResult = result.data.find((d: any) => d.year === year);
                        if (yearResult) {
                            yearData[result.scenarioName] = yearResult.net_worth;
                        }
                    });
                    comparisonChartData.push(yearData);
                }

                setComparisonData(comparisonChartData);
                setScenarioResults(prev => {
                    const newResults = { ...prev };
                    validResults.forEach(result => {
                        newResults[result.scenarioId] = result.data;
                    });
                    return newResults;
                });
            }
        } catch (err) {
            setError('Failed to compare scenarios');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'custom',
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
            description: scenario.description || '',
            type: scenario.type,
            market_condition: scenario.parameters.market_condition || 'normal',
            inflation_rate: scenario.parameters.inflation_rate || 2.5,
            income_growth_rate: scenario.parameters.income_growth_rate || 3.0,
            investment_return_rate: scenario.parameters.investment_return_rate || scenario.parameters.market_return_rate || 7.0,
            time_horizon: scenario.time_horizon_years,
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

    const getScenarioMarketCondition = (scenario: Scenario) => {
        return scenario.parameters.market_condition || 'normal';
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
                        onClick={handleCompareScenarios}
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
                <Tab label="Monte Carlo" icon={<AssessmentIcon />} />
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
                                        label={marketConditions.find(mc => mc.value === getScenarioMarketCondition(scenario))?.label}
                                        size="small"
                                        sx={{
                                            backgroundColor: getMarketConditionColor(getScenarioMarketCondition(scenario)),
                                            color: 'white',
                                            mb: 2
                                        }}
                                    />

                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            {scenario.time_horizon_years} years
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
                    {projectionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={projectionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                                <Legend />
                                <Line type="monotone" dataKey="netWorth" stroke="#1976d2" strokeWidth={2} name="Net Worth" />
                                <Line type="monotone" dataKey="assets" stroke="#2e7d32" strokeWidth={2} name="Total Assets" />
                                <Line type="monotone" dataKey="liabilities" stroke="#d32f2f" strokeWidth={2} name="Total Liabilities" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <Box textAlign="center" py={4}>
                            <Typography variant="body1" color="text.secondary">
                                Run a scenario to see projections
                            </Typography>
                        </Box>
                    )}
                </Paper>
            )}

            {activeTab === 2 && (
                <MonteCarloSimulation
                    scenarioId={selectedScenarios[0] || scenarios[0]?.id || ''}
                    scenarioName={scenarios.find(s => s.id === (selectedScenarios[0] || scenarios[0]?.id))?.name || 'Default Scenario'}
                />
            )}

            {activeTab === 3 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Scenario Comparison
                    </Typography>

                    {selectedScenarios.length < 2 ? (
                        <Box textAlign="center" py={4}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Select at least 2 scenarios from the Scenarios tab to compare them.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Currently selected: {selectedScenarios.length} scenario(s)
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <Box mb={3}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Selected Scenarios:
                                </Typography>
                                <Box display="flex" gap={1} flexWrap="wrap">
                                    {selectedScenarios.map(scenarioId => {
                                        const scenario = scenarios.find(s => s.id === scenarioId);
                                        return scenario ? (
                                            <Chip
                                                key={scenarioId}
                                                label={scenario.name}
                                                color="primary"
                                                variant="outlined"
                                                onDelete={() => handleScenarioSelection(scenarioId)}
                                            />
                                        ) : null;
                                    })}
                                </Box>
                            </Box>

                            {comparisonData.length > 0 ? (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Net Worth Comparison Over Time
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={comparisonData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="year" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Net Worth']} />
                                            <Legend />
                                            {selectedScenarios.map((scenarioId, index) => {
                                                const scenario = scenarios.find(s => s.id === scenarioId);
                                                const colors = ['#1976d2', '#2e7d32', '#d32f2f', '#f57c00', '#7b1fa2'];
                                                return (
                                                    <Line
                                                        key={scenarioId}
                                                        type="monotone"
                                                        dataKey={scenario?.name}
                                                        stroke={colors[index % colors.length]}
                                                        strokeWidth={2}
                                                        name={scenario?.name}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>

                                    <Box mt={4}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Scenario Summary Comparison
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {selectedScenarios.map(scenarioId => {
                                                const scenario = scenarios.find(s => s.id === scenarioId);
                                                const results = scenarioResults[scenarioId];
                                                const finalResult = results?.[results.length - 1];

                                                return scenario && finalResult ? (
                                                    <Grid item xs={12} md={6} lg={4} key={scenarioId}>
                                                        <Card variant="outlined">
                                                            <CardContent>
                                                                <Typography variant="h6" gutterBottom>
                                                                    {scenario.name}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                    {scenario.description}
                                                                </Typography>

                                                                <Box mt={2}>
                                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                                        <Typography variant="body2">Final Net Worth:</Typography>
                                                                        <Typography variant="body2" fontWeight="bold">
                                                                            ${finalResult.net_worth.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                                        <Typography variant="body2">Total Assets:</Typography>
                                                                        <Typography variant="body2">
                                                                            ${finalResult.total_assets.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                                        <Typography variant="body2">Total Liabilities:</Typography>
                                                                        <Typography variant="body2">
                                                                            ${finalResult.total_liabilities.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                                        <Typography variant="body2">Monthly Income:</Typography>
                                                                        <Typography variant="body2">
                                                                            ${finalResult.monthly_income.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                                                        <Typography variant="body2">Monthly Expenses:</Typography>
                                                                        <Typography variant="body2">
                                                                            ${finalResult.monthly_expenses.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box display="flex" justifyContent="space-between">
                                                                        <Typography variant="body2">Monthly Savings:</Typography>
                                                                        <Typography variant="body2" color={finalResult.monthly_savings >= 0 ? 'success.main' : 'error.main'}>
                                                                            ${finalResult.monthly_savings.toLocaleString()}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    </Grid>
                                                ) : null;
                                            })}
                                        </Grid>
                                    </Box>
                                </Box>
                            ) : (
                                <Box textAlign="center" py={4}>
                                    <Typography variant="body1" color="text.secondary" gutterBottom>
                                        Click "Compare Scenarios" to generate comparison data.
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<CompareIcon />}
                                        onClick={handleCompareScenarios}
                                        disabled={loading}
                                    >
                                        {loading ? 'Calculating...' : 'Compare Scenarios'}
                                    </Button>
                                </Box>
                            )}
                        </Box>
                    )}
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
                                <InputLabel>Scenario Type</InputLabel>
                                <Select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                >
                                    <MenuItem value="market_conditions">Market Conditions</MenuItem>
                                    <MenuItem value="inflation">Inflation</MenuItem>
                                    <MenuItem value="income_growth">Income Growth</MenuItem>
                                    <MenuItem value="life_events">Life Events</MenuItem>
                                    <MenuItem value="custom">Custom</MenuItem>
                                </Select>
                            </FormControl>
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
