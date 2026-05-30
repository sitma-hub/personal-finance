import { api } from './api';
import {
    ApiResponse,
    Transaction,
    TransactionFormData,
    TransactionFilters,
    MonthlyActualSummary,
} from '../types';

function buildQuery(filters: TransactionFilters = {}): string {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.category) params.set('category', filters.category);
    if (filters.direction) params.set('direction', filters.direction);
    if (filters.kind) params.set('kind', filters.kind);
    if (filters.account_id) params.set('account_id', filters.account_id);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const transactionService = {
    getAll: async (filters?: TransactionFilters): Promise<ApiResponse<Transaction[]>> => {
        const response = await api.get(`/transactions${buildQuery(filters)}`);
        return response.data;
    },

    getCategories: async (): Promise<ApiResponse<string[]>> => {
        const response = await api.get('/transactions/categories');
        return response.data;
    },

    getMonthlySummary: async (month?: string): Promise<ApiResponse<MonthlyActualSummary>> => {
        const response = await api.get(`/transactions/summary${month ? `?month=${month}` : ''}`);
        return response.data;
    },

    create: async (data: TransactionFormData): Promise<ApiResponse<Transaction>> => {
        const response = await api.post('/transactions', data);
        return response.data;
    },

    update: async (id: string, data: Partial<TransactionFormData>): Promise<ApiResponse<Transaction>> => {
        const response = await api.put(`/transactions/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/transactions/${id}`);
        return response.data;
    },

    importMany: async (
        transactions: TransactionFormData[]
    ): Promise<ApiResponse<{ imported: number }>> => {
        const response = await api.post('/transactions/import', { transactions });
        return response.data;
    },
};
