import React, { useState } from 'react';
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
    Chip,
    IconButton,
    Alert,
    CircularProgress,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Flag as FlagIcon,
    TrendingUp as TrendingUpIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    AttachMoney as AttachMoneyIcon,
    CalendarToday as CalendarIcon,
    Timeline as TimelineIcon,
    Assessment as AssessmentIcon,
    Warning as WarningIcon,
    Lightbulb as LightbulbIcon,
    ExpandMore as ExpandMoreIcon,
    Speed as SpeedIcon,
} from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line, Legend } from 'recharts';
import { useFinancial } from '../../contexts/FinancialContext';
import { Goal, GoalFormData } from '../../types';

const EnhancedGoals: React.FC = () => {
    const { state, actions } = useFinancial();
    const [openDialog, setOpenDialog] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState<GoalFormData>({
        name: '',
        description: '',
        target_amount: 0,
        current_progress: 0,
        target_date: '',
        priority: 3,
    });

    const priorityLabels: Record<number, string> = {
        1: 'Critical',
        2: 'High',
        3: 'Medium',
        4: 'Low',
        5: 'Optional',
    };

    const priorityColors: Record<number, string> = {
        1: '#d32f2f',
        2: '#f57c00',
        3: '#1976d2',
        4: '#2e7d32',
        5: '#757575',
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            target_amount: 0,
            current_progress: 0,
            target_date: '',
            priority: 3,
        });
    };

    const openCreateDialog = () => {
        resetForm();
        setEditingGoal(null);
        setOpenDialog(true);
    };

    const openEditDialog = (goal: Goal) => {
        setFormData({
            name: goal.name,
            description: goal.description || '',
            target_amount: goal.target_amount,
            current_progress: goal.current_progress,
            target_date: goal.target_date.split('T')[0],
            priority: goal.priority,
        });
        setEditingGoal(goal);
        setOpenDialog(true);
    };

    const handleCreateGoal = async () => {
        try {
            await actions.addGoal(formData);
            setOpenDialog(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create goal:', error);
        }
    };

    const handleUpdateGoal = async () => {
        if (!editingGoal) return;
        try {
            await actions.updateGoal(editingGoal.id, formData);
            setOpenDialog(false);
            setEditingGoal(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update goal:', error);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        setGoalToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteGoal = async () => {
        if (!goalToDelete) return;
        try {
            await actions.deleteGoal(goalToDelete);
            setDeleteConfirmOpen(false);
            setGoalToDelete(null);
        } catch (error) {
            console.error('Failed to delete goal:', error);
        }
    };

    const getProgressPercentage = (goal: Goal) => {
        const current = Number(goal.current_progress) || 0;
        const target = Number(goal.target_amount) || 0;
        if (target === 0) return 0;
        return Math.min((current / target) * 100, 100);
    };

    const getDaysUntilTarget = (targetDate: string) => {
        const target = new Date(targetDate);
        const today = new Date();
        const diffTime = target.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getGoalFeasibilityAnalysis = (goal: Goal) => {
        const daysLeft = getDaysUntilTarget(goal.target_date);
        const monthsLeft = daysLeft / 30;
        const remainingAmount = goal.target_amount - goal.current_progress;
        const monthlyNeeded = remainingAmount / monthsLeft;
        const availableSavings = state.currentSnapshot.monthlySavings;

        const feasibilityRatio = availableSavings > 0 ? monthlyNeeded / availableSavings : Infinity;

        let feasibility: 'easy' | 'moderate' | 'challenging' | 'difficult';
        let color: 'success' | 'info' | 'warning' | 'error';
        let recommendation: string;

        if (feasibilityRatio <= 0.3) {
            feasibility = 'easy';
            color = 'success';
            recommendation = 'This goal is easily achievable with your current savings rate. Consider accelerating it or setting a more ambitious target.';
        } else if (feasibilityRatio <= 0.6) {
            feasibility = 'moderate';
            color = 'info';
            recommendation = 'This goal is achievable with disciplined saving. Stay on track with your current plan.';
        } else if (feasibilityRatio <= 1.0) {
            feasibility = 'challenging';
            color = 'warning';
            recommendation = 'This goal will require most of your available savings. Consider increasing income or reducing expenses.';
        } else {
            feasibility = 'difficult';
            color = 'error';
            recommendation = 'This goal may be difficult to achieve with current savings. Consider extending the timeline or increasing your savings rate.';
        }

        return {
            monthlyNeeded,
            feasibility,
            color,
            recommendation,
            feasibilityRatio
        };
    };

    // Format currency values
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Calculate summary statistics
    const totalTargetAmount = state.goals.reduce((sum, goal) => sum + (Number(goal.target_amount) || 0), 0);
    const totalCurrentAmount = state.goals.reduce((sum, goal) => sum + (Number(goal.current_progress) || 0), 0);
    const achievedGoals = state.goals.filter(goal => goal.is_achieved).length;
    const activeGoals = state.goals.filter(goal => !goal.is_achieved).length;

    // Prepare chart data
    const priorityData = Object.entries(priorityLabels).map(([priority, label]) => {
        const priorityGoals = state.goals.filter(goal => goal.priority === Number(priority));
        const count = priorityGoals.length;
        const totalValue = priorityGoals.reduce((sum, goal) => sum + goal.target_amount, 0);
        return {
            priority: label,
            count,
            totalValue,
            color: priorityColors[Number(priority) as keyof typeof priorityColors],
        };
    });

    // Goal progress over time (projected)
    const goalProgressData = state.goals
        .filter(goal => !goal.is_achieved)
        .map(goal => {
            const analysis = getGoalFeasibilityAnalysis(goal);
            const monthsLeft = getDaysUntilTarget(goal.target_date) / 30;
            const progressData = [];

            for (let month = 0; month <= Math.min(monthsLeft, 24); month++) {
                const projectedProgress = goal.current_progress + (analysis.monthlyNeeded * month);
                progressData.push({
                    month: `Month ${month}`,
                    [goal.name]: Math.min(projectedProgress, goal.target_amount),
                    target: goal.target_amount,
                });
            }

            return progressData;
        })
        .flat()
        .reduce((acc, item) => {
            const existing = acc.find(x => x.month === item.month);
            if (existing) {
                Object.assign(existing, item);
            } else {
                acc.push(item);
            }
            return acc;
        }, [] as any[]);

    if (state.loading && state.goals.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Smart Goal Planning
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Intelligent goal tracking with feasibility analysis and personalized recommendations
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateDialog}
                >
                    New Goal
                </Button>
            </Box>

            {state.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {state.error}
                </Alert>
            )}

            {/* Goal Insights */}
            {state.insights.filter(insight => insight.relatedGoals && insight.relatedGoals.length > 0).length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Goal-Specific Insights
                    </Typography>
                    <Grid container spacing={2}>
                        {state.insights
                            .filter(insight => insight.relatedGoals && insight.relatedGoals.length > 0)
                            .slice(0, 4)
                            .map((insight, index) => (
                                <Grid item xs={12} md={6} key={index}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box display="flex" alignItems="flex-start">
                                                <Box sx={{ mr: 2 }}>
                                                    {insight.type === 'warning' && <WarningIcon color="warning" />}
                                                    {insight.type === 'opportunity' && <LightbulbIcon color="success" />}
                                                    {insight.type === 'recommendation' && <AssessmentIcon color="info" />}
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle1" gutterBottom>
                                                        {insight.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" paragraph>
                                                        {insight.description}
                                                    </Typography>
                                                    <Box>
                                                        {insight.actionItems.slice(0, 2).map((action, actionIndex) => (
                                                            <Typography key={actionIndex} variant="body2" color="text.secondary">
                                                                • {action}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                    </Grid>
                </Paper>
            )}

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center">
                                <AttachMoneyIcon color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Total Target Amount
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(totalTargetAmount)}
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
                                <TrendingUpIcon color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Current Progress
                                    </Typography>
                                    <Typography variant="h5">
                                        {formatCurrency(totalCurrentAmount)}
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
                                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Achieved Goals
                                    </Typography>
                                    <Typography variant="h5">
                                        {achievedGoals}
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
                                <FlagIcon color="info" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography color="textSecondary" gutterBottom variant="body2">
                                        Active Goals
                                    </Typography>
                                    <Typography variant="h5">
                                        {activeGoals}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Goals by Priority
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={priorityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="priority" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#2196f3" name="Number of Goals" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Goal Value by Priority
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={priorityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="priority" />
                                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                                <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Total Value']} />
                                <Bar dataKey="totalValue" fill="#4caf50" name="Total Value" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Goal Progress Projection */}
            {goalProgressData.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Projected Goal Progress
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={goalProgressData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                            <RechartsTooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Progress']} />
                            <Legend />
                            {state.goals.filter(g => !g.is_achieved).slice(0, 5).map((goal, index) => (
                                <Line
                                    key={goal.id}
                                    type="monotone"
                                    dataKey={goal.name}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    name={goal.name}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            )}

            {/* Goals Table with Feasibility Analysis */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    All Goals with Smart Analysis
                </Typography>
                {state.loading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                ) : state.goals && state.goals.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Goal</TableCell>
                                    <TableCell align="right">Target Amount</TableCell>
                                    <TableCell align="right">Current Progress</TableCell>
                                    <TableCell align="center">Progress</TableCell>
                                    <TableCell align="center">Feasibility</TableCell>
                                    <TableCell align="center">Monthly Needed</TableCell>
                                    <TableCell align="center">Priority</TableCell>
                                    <TableCell align="center">Target Date</TableCell>
                                    <TableCell align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {state.goals.map((goal) => {
                                    const progress = getProgressPercentage(goal);
                                    const daysUntilTarget = getDaysUntilTarget(goal.target_date);
                                    const isOverdue = daysUntilTarget < 0;
                                    const isAchieved = goal.is_achieved;
                                    const analysis = getGoalFeasibilityAnalysis(goal);

                                    return (
                                        <TableRow key={goal.id}>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="subtitle2">
                                                        {goal.name}
                                                    </Typography>
                                                    {goal.description && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {goal.description}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(Number(goal.target_amount) || 0)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(Number(goal.current_progress) || 0)}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ width: 100 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={progress}
                                                        sx={{ height: 8, borderRadius: 4 }}
                                                        color={progress >= 75 ? 'success' : progress >= 50 ? 'warning' : 'primary'}
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {progress.toFixed(1)}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                {!isAchieved ? (
                                                    <Tooltip title={analysis.recommendation}>
                                                        <Chip
                                                            label={analysis.feasibility}
                                                            size="small"
                                                            color={analysis.color}
                                                            icon={<SpeedIcon />}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip label="Achieved" size="small" color="success" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                {!isAchieved ? (
                                                    <Typography variant="body2">
                                                        {formatCurrency(analysis.monthlyNeeded)}
                                                    </Typography>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary">
                                                        -
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={priorityLabels[goal.priority]}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: priorityColors[goal.priority],
                                                        color: 'white',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box display="flex" flexDirection="column" alignItems="center">
                                                    <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.secondary'}>
                                                        {goal.target_date.split('T')[0]}
                                                    </Typography>
                                                    <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                                                        {isOverdue ? `${Math.abs(daysUntilTarget)} days overdue` :
                                                            `${daysUntilTarget} days left`}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    onClick={() => openEditDialog(goal)}
                                                    size="small"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleDeleteGoal(goal.id)}
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <FlagIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            No Goals Yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Create your first financial goal to get started with smart planning.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreateDialog}
                        >
                            Create First Goal
                        </Button>
                    </Box>
                )}
            </Paper>

            {/* Create/Edit Goal Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingGoal ? 'Edit Goal' : 'Create New Goal'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Goal Name"
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
                            <TextField
                                fullWidth
                                label="Target Amount ($)"
                                type="number"
                                value={formData.target_amount}
                                onChange={(e) => setFormData({ ...formData, target_amount: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Current Amount ($)"
                                type="number"
                                value={formData.current_progress}
                                onChange={(e) => setFormData({ ...formData, current_progress: Number(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Target Date"
                                type="date"
                                value={formData.target_date}
                                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                                >
                                    {Object.entries(priorityLabels).map(([value, label]) => (
                                        <MenuItem key={value} value={Number(value)}>
                                            <Box display="flex" alignItems="center">
                                                <Box
                                                    width={12}
                                                    height={12}
                                                    borderRadius="50%"
                                                    bgcolor={priorityColors[Number(value) as keyof typeof priorityColors]}
                                                    mr={1}
                                                />
                                                {label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
                        variant="contained"
                        disabled={state.loading}
                    >
                        {state.loading ? <CircularProgress size={20} /> : (editingGoal ? 'Update' : 'Create')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this goal? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button
                        onClick={confirmDeleteGoal}
                        variant="contained"
                        color="error"
                        disabled={state.loading}
                    >
                        {state.loading ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export default EnhancedGoals;
