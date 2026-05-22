import { api } from './api';
import { ApiResponse, InvestmentProjectionsResponse, NetWorthProjectionsResponse } from '../types';

export const projectionService = {
    getInvestmentProjections: async (years = 10): Promise<ApiResponse<InvestmentProjectionsResponse>> => {
        const response = await api.get(`/projections/investments?years=${years}`);
        return response.data;
    },

    getNetWorthProjections: async (years = 10): Promise<ApiResponse<NetWorthProjectionsResponse>> => {
        const response = await api.get(`/projections/net-worth?years=${years}`);
        return response.data;
    },
};
