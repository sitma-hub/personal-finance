import { api } from './api';
import { ApiResponse, InvestmentProjectionsResponse, NetWorthProjectionsResponse } from '../types';

export const projectionService = {
    getInvestmentProjections: async (years = 10): Promise<ApiResponse<InvestmentProjectionsResponse>> => {
        const response = await api.get(`/projections/investments?years=${years}`);
        return response.data;
    },

    getNetWorthProjections: async (years = 10): Promise<ApiResponse<NetWorthProjectionsResponse>> => {
        const timeout = Math.min(120_000, 20_000 + years * 2_000);
        const response = await api.get(`/projections/net-worth?years=${years}`, { timeout });
        return response.data;
    },
};
