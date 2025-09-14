import axios from 'axios';
import { ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add any auth tokens here if needed
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized access
            console.error('Unauthorized access');
        }
        return Promise.reject(error);
    }
);

export interface DashboardSummary {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    savingsRate: number;
    assetCount: number;
    liabilityCount: number;
    incomeStreamCount: number;
    expenseCount: number;
    activeGoalsCount: number;
    achievedGoalsCount: number;
    activeScenariosCount: number;
    totalScenariosCount: number;
}

export interface AssetAllocation {
    type: string;
    value: number;
    percentage: number;
}

export interface ExpenseBreakdown {
    category: string;
    amount: number;
    percentage: number;
}

export interface NetWorthTrend {
    month: string;
    netWorth: number;
    assets: number;
    liabilities: number;
}

export interface GoalProgress {
    id: string;
    name: string;
    targetAmount: number;
    currentProgress: number;
    progressPercentage: number;
    targetDate: string;
}

export const dashboardService = {
    getDashboardSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
        const response = await api.get('/dashboard/summary');
        return response.data;
    },

    getAssetAllocation: async (): Promise<ApiResponse<AssetAllocation[]>> => {
        const response = await api.get('/dashboard/asset-allocation');
        return response.data;
    },

    getExpenseBreakdown: async (): Promise<ApiResponse<ExpenseBreakdown[]>> => {
        const response = await api.get('/dashboard/expense-breakdown');
        return response.data;
    },

    getNetWorthTrend: async (months: number = 6): Promise<ApiResponse<NetWorthTrend[]>> => {
        const response = await api.get(`/dashboard/net-worth-trend?months=${months}`);
        return response.data;
    },

    getGoalsProgress: async (): Promise<ApiResponse<GoalProgress[]>> => {
        const response = await api.get('/dashboard/goals-progress');
        return response.data;
    },

    getRecentActivity: async (limit: number = 10): Promise<ApiResponse<any[]>> => {
        const response = await api.get(`/dashboard/recent-activity?limit=${limit}`);
        return response.data;
    },

    runQuickScenario: async (scenarioType: string, parameters: Record<string, any>): Promise<ApiResponse<any>> => {
        const response = await api.post('/dashboard/quick-scenario', {
            scenarioType,
            parameters,
        });
        return response.data;
    },

    getMonteCarloPreview: async (): Promise<ApiResponse<any>> => {
        const response = await api.get('/dashboard/monte-carlo-preview');
        return response.data;
    },
};
