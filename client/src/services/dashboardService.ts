import { api } from './api';
import {
    ApiResponse,
    DashboardSummary,
    AssetAllocation,
    NetWorthTrend,
    RecentValueUpdate,
} from '../types';

export const dashboardService = {
    getDashboardSummary: async (): Promise<ApiResponse<DashboardSummary>> => {
        const response = await api.get('/dashboard/summary');
        return response.data;
    },

    getAssetAllocation: async (): Promise<ApiResponse<AssetAllocation[]>> => {
        const response = await api.get('/dashboard/asset-allocation');
        return response.data;
    },

    getNetWorthHistory: async (): Promise<ApiResponse<NetWorthTrend[]>> => {
        const response = await api.get('/dashboard/history');
        return response.data;
    },

    getRecentUpdates: async (limit = 15): Promise<ApiResponse<RecentValueUpdate[]>> => {
        const response = await api.get(`/dashboard/recent-updates?limit=${limit}`);
        return response.data;
    },
};
