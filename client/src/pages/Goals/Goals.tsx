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
} from '@mui/icons-material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

interface Goal {
    id: string;
    name: string;
    description: string;
    target_amount: number;
    current_progress: number;
    target_date: string;
    priority: 1 | 2 | 3 | 4 | 5;
    is_achieved: boolean;
    achieved_date?: string;
    created_at: string;
    updated_at: string;
}

interface GoalFormData {
    name: string;
    description: string;
    target_amount: number;
    current_progress: number;
    target_date: string;
    priority: number;
}

const Goals: React.FC = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    const priorityLabels = {
        1: 'Critical',
        2: 'High',
        3: 'Medium',
        4: 'Low',
        5: 'Optional',
    };

    const priorityColors = {
        1: '#d32f2f',
        2: '#f57c00',
        3: '#1976d2',
        4: '#2e7d32',
        5: '#757575',
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/goals');
            const data = await response.json();
            if (data.success) {
                setGoals(data.data);
            } else {
                setError(data.error?.message || 'Failed to fetch goals');
            }
        } catch (err) {
            setError('Failed to fetch goals');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGoal = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                setGoals([...goals, data.data]);
                setOpenDialog(false);
                resetForm();
            } else {
                setError(data.error?.message || 'Failed to create goal');
            }
        } catch (err) {
            setError('Failed to create goal');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateGoal = async () => {
        if (!editingGoal) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/goals/${editingGoal.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                setGoals(goals.map(g => g.id === editingGoal.id ? data.data : g));
                setOpenDialog(false);
                setEditingGoal(null);
                resetForm();
            } else {
                setError(data.error?.message || 'Failed to update goal');
            }
        } catch (err) {
            setError('Failed to update goal');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        setGoalToDelete(id);
        setDeleteConfirmOpen(true);
    };

    const confirmDeleteGoal = async () => {
        if (!goalToDelete) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/goals/${goalToDelete}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                setGoals(goals.filter(g => g.id !== goalToDelete));
            } else {
                setError(data.error?.message || 'Failed to delete goal');
            }
        } catch (err) {
            setError('Failed to delete goal');
        } finally {
            setLoading(false);
            setDeleteConfirmOpen(false);
            setGoalToDelete(null);
        }
    };

    const handleAchieveGoal = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/goals/${id}/achieve`, {
                method: 'PATCH',
            });
            const data = await response.json();
            if (data.success) {
                setGoals(goals.map(g => g.id === id ? data.data : g));
            } else {
                setError(data.error?.message || 'Failed to mark goal as achieved');
            }
        } catch (err) {
            setError('Failed to mark goal as achieved');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAchievedGoal = async (id: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/goals/${id}/reset`, {
                method: 'PATCH',
            });
            const data = await response.json();
            if (data.success) {
                setGoals(goals.map(g => g.id === id ? data.data : g));
            } else {
                setError(data.error?.message || 'Failed to reset goal achievement status');
            }
        } catch (err) {
            setError('Failed to reset goal achievement status');
        } finally {
            setLoading(false);
        }
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
            description: goal.description,
            target_amount: goal.target_amount,
            current_progress: goal.current_progress,
            target_date: goal.target_date.split('T')[0], // Convert to YYYY-MM-DD format
            priority: goal.priority,
        });
        setEditingGoal(goal);
        setOpenDialog(true);
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

    // Format currency values properly
    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate summary statistics
    const totalTargetAmount = goals.reduce((sum, goal) => sum + (Number(goal.target_amount) || 0), 0);
    const totalCurrentAmount = goals.reduce((sum, goal) => sum + (Number(goal.current_progress) || 0), 0);
    const achievedGoals = goals.filter(goal => goal.is_achieved).length;
    const activeGoals = goals.filter(goal => !goal.is_achieved).length;

    // Prepare chart data
    const priorityData = Object.entries(priorityLabels).map(([priority, label]) => {
        const priorityGoals = goals.filter(goal => goal.priority === Number(priority));
        const count = priorityGoals.length;
        return {
            priority: label,
            count,
            color: priorityColors[Number(priority) as keyof typeof priorityColors],
        };
    });

    if (loading && goals.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" gutterBottom>
                    Financial Goals
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateDialog}
                >
                    New Goal
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

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
                <Grid item xs={12}>
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
                                <Bar dataKey="count" fill="#2196f3" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* Goals Table */}
            <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        All Goals
                    </Typography>
                    {loading ? (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    ) : goals && goals.length > 0 ? (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Name</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell align="right">Target Amount</TableCell>
                                        <TableCell align="right">Current Progress</TableCell>
                                        <TableCell align="center">Progress</TableCell>
                                        <TableCell align="center">Priority</TableCell>
                                        <TableCell align="center">Target Date</TableCell>
                                        <TableCell align="center">Status</TableCell>
                                        <TableCell align="center">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {goals.map((goal) => {
                                        const progress = getProgressPercentage(goal);
                                        const daysUntilTarget = getDaysUntilTarget(goal.target_date);
                                        const isOverdue = daysUntilTarget < 0;
                                        const isAchieved = goal.is_achieved;

                                        return (
                                            <TableRow key={goal.id}>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center">
                                                        <FlagIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                        <Typography>
                                                            {goal.name}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {goal.description}
                                                    </Typography>
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
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {progress.toFixed(1)}%
                                                        </Typography>
                                                    </Box>
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
                                                    <Box display="flex" alignItems="center" justifyContent="center">
                                                        <CalendarIcon sx={{ mr: 1, fontSize: 16 }} />
                                                        <Typography variant="body2" color={isOverdue ? 'error.main' : 'text.secondary'}>
                                                            {goal.target_date.split('T')[0]}
                                                        </Typography>
                                                    </Box>
                                                    <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                                                        {isOverdue ? `${Math.abs(daysUntilTarget)} days overdue` :
                                                            `${daysUntilTarget} days left`}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={isAchieved ? 'Achieved' : 'Active'}
                                                        size="small"
                                                        color={isAchieved ? 'success' : 'primary'}
                                                        variant="outlined"
                                                    />
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
                                                    {!isAchieved ? (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            startIcon={<CheckCircleIcon />}
                                                            onClick={() => handleAchieveGoal(goal.id)}
                                                            sx={{ ml: 1 }}
                                                        >
                                                            Achieve
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="secondary"
                                                            startIcon={<CheckCircleIcon />}
                                                            onClick={() => handleResetAchievedGoal(goal.id)}
                                                            sx={{ ml: 1 }}
                                                        >
                                                            Reset
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h6" gutterBottom>
                                No Goals Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Create your first financial goal to get started with planning.
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
            </Grid>

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
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : (editingGoal ? 'Update' : 'Create')}
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
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Goals;
