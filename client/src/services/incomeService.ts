import { api } from './api';
import { IncomeStream, IncomeFormData, ApiResponse } from '../types';

export const incomeService = {
    getAllIncomeStreams: async (): Promise<ApiResponse<IncomeStream[]>> => {
        const response = await api.get('/income');
        return response.data;
    },

    createIncomeStream: async (incomeData: IncomeFormData): Promise<ApiResponse<IncomeStream>> => {
        const response = await api.post('/income', incomeData);
        return response.data;
    },

    updateIncomeStream: async (id: string, incomeData: Partial<IncomeFormData>): Promise<ApiResponse<IncomeStream>> => {
        const response = await api.put(`/income/${id}`, incomeData);
        return response.data;
    },

    deleteIncomeStream: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/income/${id}`);
        return response.data;
    },
};
