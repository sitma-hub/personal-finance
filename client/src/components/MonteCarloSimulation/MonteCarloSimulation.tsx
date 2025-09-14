import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Slider,
    Alert,
    CircularProgress,
    Chip,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    TrendingUp as TrendingUpIcon,
    Assessment as AssessmentIcon,
    Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
} from 'recharts';

interface MonteCarloSimulation {
    id: string;
    scenario_id: string;
    simulation_name: string;
    iterations: number;
    status: 'running' | 'completed' | 'failed';
    results?: {
        percentiles: {
            p5: number[];
            p25: number[];
            p50: number[];
            p75: number[];
            p95: number[];
        };
        goal_achievement_probability: number;
        final_value_distribution: number[];
        confidence_intervals: {
            year: number;
            lower: number;
            upper: number;
        }[];
    };
    created_at: string;
    completed_at?: string;
}

interface MonteCarloSimulationProps {
    scenarioId: string;
    scenarioName: string;
}

const MonteCarloSimulation: React.FC<MonteCarloSimulationProps> = ({ scenarioId, scenarioName }) => {
    const [simulations, setSimulations] = useState<MonteCarloSimulation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [runningSimulation, setRunningSimulation] = useState<string | null>(null);

    const [simulationConfig, setSimulationConfig] = useState({
        iterations: 1000,
        simulation_name: '',
        goal_amount: 1000000,
        goal_year: 10,
    });

    // Sample data for demonstration
    const [sampleResults, setSampleResults] = useState({
        percentiles: {
            p5: [100000, 95000, 90000, 85000, 80000, 75000, 70000, 65000, 60000, 55000, 50000],
            p25: [100000, 105000, 110000, 115000, 120000, 125000, 130000, 135000, 140000, 145000, 150000],
            p50: [100000, 110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000, 190000, 200000],
            p75: [100000, 115000, 130000, 145000, 160000, 175000, 190000, 205000, 220000, 235000, 250000],
            p95: [100000, 120000, 140000, 160000, 180000, 200000, 220000, 240000, 260000, 280000, 300000],
        },
        goal_achievement_probability: 0.73,
        final_value_distribution: [150000, 180000, 200000, 220000, 250000, 280000, 300000, 320000, 350000, 380000],
    });

    const runSimulation = async () => {
        if (!simulationConfig.simulation_name.trim()) {
            setError('Please enter a simulation name');
            return;
        }

        setLoading(true);
        setError(null);
        setRunningSimulation('new');

        try {
            const response = await fetch(`/api/scenarios/${scenarioId}/monte-carlo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    iterations: simulationConfig.iterations,
                    simulation_name: simulationConfig.simulation_name,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setSimulations([data.data, ...simulations]);
                setSimulationConfig(prev => ({ ...prev, simulation_name: '' }));
            } else {
                setError(data.error?.message || 'Failed to run simulation');
            }
        } catch (err) {
            setError('Failed to run simulation');
        } finally {
            setLoading(false);
            setRunningSimulation(null);
        }
    };

    const getSimulationResults = async (simulationId: string) => {
        try {
            const response = await fetch(`/api/scenarios/${scenarioId}/monte-carlo/${simulationId}`);
            const data = await response.json();
            if (data.success) {
                setSimulations(prev => prev.map(s =>
                    s.id === simulationId ? { ...s, results: data.data.results } : s
                ));
            }
        } catch (err) {
            console.error('Failed to fetch simulation results:', err);
        }
    };

    // Generate chart data from percentile results
    const generateChartData = (percentiles: any) => {
        const years = Array.from({ length: 11 }, (_, i) => i);
        return years.map(year => ({
            year,
            p5: percentiles.p5[year],
            p25: percentiles.p25[year],
            p50: percentiles.p50[year],
            p75: percentiles.p75[year],
            p95: percentiles.p95[year],
        }));
    };

    const chartData = generateChartData(sampleResults.percentiles);

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Monte Carlo Simulation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Run probability-based simulations to understand the range of possible financial outcomes for "{scenarioName}"
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Simulation Configuration */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Simulation Settings
                        </Typography>

                        <TextField
                            fullWidth
                            label="Simulation Name"
                            value={simulationConfig.simulation_name}
                            onChange={(e) => setSimulationConfig(prev => ({ ...prev, simulation_name: e.target.value }))}
                            sx={{ mb: 3 }}
                        />

                        <Typography gutterBottom>
                            Iterations: {simulationConfig.iterations.toLocaleString()}
                        </Typography>
                        <Slider
                            value={simulationConfig.iterations}
                            onChange={(_, value) => setSimulationConfig(prev => ({ ...prev, iterations: value as number }))}
                            min={100}
                            max={10000}
                            step={100}
                            marks={[
                                { value: 100, label: '100' },
                                { value: 1000, label: '1K' },
                                { value: 5000, label: '5K' },
                                { value: 10000, label: '10K' },
                            ]}
                            sx={{ mb: 3 }}
                        />

                        <TextField
                            fullWidth
                            label="Goal Amount ($)"
                            type="number"
                            value={simulationConfig.goal_amount}
                            onChange={(e) => setSimulationConfig(prev => ({ ...prev, goal_amount: Number(e.target.value) }))}
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Goal Year"
                            type="number"
                            value={simulationConfig.goal_year}
                            onChange={(e) => setSimulationConfig(prev => ({ ...prev, goal_year: Number(e.target.value) }))}
                            sx={{ mb: 3 }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<PlayIcon />}
                            onClick={runSimulation}
                            disabled={loading || runningSimulation === 'new'}
                        >
                            {loading && runningSimulation === 'new' ? (
                                <CircularProgress size={20} />
                            ) : (
                                'Run Simulation'
                            )}
                        </Button>
                    </Paper>
                </Grid>

                {/* Results Visualization */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Probability Distribution
                        </Typography>

                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Value']} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="p95"
                                    stackId="1"
                                    stroke="#ff9800"
                                    fill="#ff9800"
                                    fillOpacity={0.1}
                                    name="95th Percentile"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="p75"
                                    stackId="1"
                                    stroke="#4caf50"
                                    fill="#4caf50"
                                    fillOpacity={0.2}
                                    name="75th Percentile"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="p50"
                                    stackId="1"
                                    stroke="#2196f3"
                                    fill="#2196f3"
                                    fillOpacity={0.3}
                                    name="50th Percentile (Median)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="p25"
                                    stackId="1"
                                    stroke="#4caf50"
                                    fill="#4caf50"
                                    fillOpacity={0.2}
                                    name="25th Percentile"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="p5"
                                    stackId="1"
                                    stroke="#ff9800"
                                    fill="#ff9800"
                                    fillOpacity={0.1}
                                    name="5th Percentile"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Goal Achievement Probability */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Goal Achievement Probability
                        </Typography>

                        <Box display="flex" alignItems="center" mb={2}>
                            <Typography variant="h3" color="primary" sx={{ mr: 2 }}>
                                {(sampleResults.goal_achievement_probability * 100).toFixed(1)}%
                            </Typography>
                            <Box>
                                <Typography variant="body2" color="text.secondary">
                                    Probability of reaching
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    ${simulationConfig.goal_amount.toLocaleString()} by year {simulationConfig.goal_year}
                                </Typography>
                            </Box>
                        </Box>

                        <LinearProgress
                            variant="determinate"
                            value={sampleResults.goal_achievement_probability * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                        />

                        <Box display="flex" justifyContent="space-between" mt={1}>
                            <Typography variant="body2" color="text.secondary">
                                0%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                100%
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Final Value Distribution */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Final Value Distribution
                        </Typography>

                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={sampleResults.final_value_distribution.map((value, index) => ({
                                range: `${(value - 50000).toLocaleString()}-${value.toLocaleString()}`,
                                count: Math.floor(Math.random() * 100) + 10,
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#2196f3" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Previous Simulations */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Previous Simulations
                        </Typography>

                        {simulations.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                                No simulations run yet. Create your first simulation above.
                            </Typography>
                        ) : (
                            <List>
                                {simulations.map((simulation, index) => (
                                    <React.Fragment key={simulation.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                <AssessmentIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={simulation.simulation_name}
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" component="span">
                                                            {simulation.iterations.toLocaleString()} iterations •
                                                            {simulation.status === 'completed' ? ' Completed' :
                                                                simulation.status === 'running' ? ' Running...' : ' Failed'}
                                                        </Typography>
                                                        {simulation.results && (
                                                            <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                                                                Goal Achievement: {(simulation.results.goal_achievement_probability * 100).toFixed(1)}%
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <Chip
                                                label={simulation.status}
                                                color={simulation.status === 'completed' ? 'success' :
                                                    simulation.status === 'running' ? 'warning' : 'error'}
                                                size="small"
                                            />
                                        </ListItem>
                                        {index < simulations.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MonteCarloSimulation;
