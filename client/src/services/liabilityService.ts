import { api } from './api';
import { Liability, ApiResponse, LiabilityBalanceHistory } from '../types';

export const liabilityService = {
    getAllLiabilities: async (): Promise<ApiResponse<Liability[]>> => {
        const response = await api.get('/liabilities');
        return response.data;
    },

    createLiability: async (data: Partial<Liability>): Promise<ApiResponse<Liability>> => {
        const response = await api.post('/liabilities', data);
        return response.data;
    },

    updateLiability: async (id: string, data: Partial<Liability>): Promise<ApiResponse<Liability>> => {
        const response = await api.put(`/liabilities/${id}`, data);
        return response.data;
    },

    deleteLiability: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/liabilities/${id}`);
        return response.data;
    },

    getBalanceHistory: async (id: string): Promise<ApiResponse<LiabilityBalanceHistory[]>> => {
        const response = await api.get(`/liabilities/${id}/history`);
        return response.data;
    },
};
