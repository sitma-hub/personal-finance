import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardService, DashboardSummary, AssetAllocation, ExpenseBreakdown, NetWorthTrend, GoalProgress } from '../../services/dashboardService';

interface DashboardState {
    summary: DashboardSummary | null;
    assetAllocation: AssetAllocation[];
    expenseBreakdown: ExpenseBreakdown[];
    netWorthTrend: NetWorthTrend[];
    goalsProgress: GoalProgress[];
    recentActivity: any[];
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

const initialState: DashboardState = {
    summary: null,
    assetAllocation: [],
    expenseBreakdown: [],
    netWorthTrend: [],
    goalsProgress: [],
    recentActivity: [],
    loading: false,
    error: null,
    lastUpdated: null,
};

// Async thunks
export const fetchDashboardSummary = createAsyncThunk(
    'dashboard/fetchSummary',
    async () => {
        const response = await dashboardService.getDashboardSummary();
        return response.data;
    }
);

export const fetchAssetAllocation = createAsyncThunk(
    'dashboard/fetchAssetAllocation',
    async () => {
        const response = await dashboardService.getAssetAllocation();
        return response.data;
    }
);

export const fetchExpenseBreakdown = createAsyncThunk(
    'dashboard/fetchExpenseBreakdown',
    async () => {
        const response = await dashboardService.getExpenseBreakdown();
        return response.data;
    }
);

export const fetchNetWorthTrend = createAsyncThunk(
    'dashboard/fetchNetWorthTrend',
    async (months: number = 6) => {
        const response = await dashboardService.getNetWorthTrend(months);
        return response.data;
    }
);

export const fetchGoalsProgress = createAsyncThunk(
    'dashboard/fetchGoalsProgress',
    async () => {
        const response = await dashboardService.getGoalsProgress();
        return response.data;
    }
);

export const fetchRecentActivity = createAsyncThunk(
    'dashboard/fetchRecentActivity',
    async (limit: number = 10) => {
        const response = await dashboardService.getRecentActivity(limit);
        return response.data;
    }
);

export const runQuickScenario = createAsyncThunk(
    'dashboard/runQuickScenario',
    async ({ scenarioType, parameters }: { scenarioType: string; parameters: Record<string, any> }) => {
        const response = await dashboardService.runQuickScenario(scenarioType, parameters);
        return response.data;
    }
);

export const fetchAllDashboardData = createAsyncThunk(
    'dashboard/fetchAll',
    async () => {
        const [summary, assetAllocation, expenseBreakdown, netWorthTrend, goalsProgress, recentActivity] = await Promise.all([
            dashboardService.getDashboardSummary(),
            dashboardService.getAssetAllocation(),
            dashboardService.getExpenseBreakdown(),
            dashboardService.getNetWorthTrend(),
            dashboardService.getGoalsProgress(),
            dashboardService.getRecentActivity(),
        ]);

        return {
            summary: summary.data,
            assetAllocation: assetAllocation.data,
            expenseBreakdown: expenseBreakdown.data,
            netWorthTrend: netWorthTrend.data,
            goalsProgress: goalsProgress.data,
            recentActivity: recentActivity.data,
        };
    }
);

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setLastUpdated: (state) => {
            state.lastUpdated = new Date().toISOString();
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch all dashboard data
            .addCase(fetchAllDashboardData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllDashboardData.fulfilled, (state, action) => {
                state.loading = false;
                state.summary = action.payload.summary || null;
                state.assetAllocation = action.payload.assetAllocation || [];
                state.expenseBreakdown = action.payload.expenseBreakdown || [];
                state.netWorthTrend = action.payload.netWorthTrend || [];
                state.goalsProgress = action.payload.goalsProgress || [];
                state.recentActivity = action.payload.recentActivity || [];
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchAllDashboardData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch dashboard data';
            })
            // Fetch summary
            .addCase(fetchDashboardSummary.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
                state.loading = false;
                state.summary = action.payload || null;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(fetchDashboardSummary.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch dashboard summary';
            })
            // Fetch asset allocation
            .addCase(fetchAssetAllocation.fulfilled, (state, action) => {
                state.assetAllocation = action.payload || [];
            })
            // Fetch expense breakdown
            .addCase(fetchExpenseBreakdown.fulfilled, (state, action) => {
                state.expenseBreakdown = action.payload || [];
            })
            // Fetch net worth trend
            .addCase(fetchNetWorthTrend.fulfilled, (state, action) => {
                state.netWorthTrend = action.payload || [];
            })
            // Fetch goals progress
            .addCase(fetchGoalsProgress.fulfilled, (state, action) => {
                state.goalsProgress = action.payload || [];
            })
            // Fetch recent activity
            .addCase(fetchRecentActivity.fulfilled, (state, action) => {
                state.recentActivity = action.payload || [];
            })
            // Run quick scenario
            .addCase(runQuickScenario.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(runQuickScenario.fulfilled, (state) => {
                state.loading = false;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(runQuickScenario.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to run quick scenario';
            });
    },
});

export const { clearError, setLastUpdated } = dashboardSlice.actions;
export default dashboardSlice.reducer;
