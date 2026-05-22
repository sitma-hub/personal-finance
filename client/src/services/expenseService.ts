import { api } from './api';
import { Expense, ExpenseFormData, ApiResponse } from '../types';

export const expenseService = {
    getAllExpenses: async (): Promise<ApiResponse<Expense[]>> => {
        const response = await api.get('/expenses');
        return response.data;
    },

    createExpense: async (expenseData: ExpenseFormData): Promise<ApiResponse<Expense>> => {
        const response = await api.post('/expenses', expenseData);
        return response.data;
    },

    updateExpense: async (id: string, expenseData: Partial<ExpenseFormData>): Promise<ApiResponse<Expense>> => {
        const response = await api.put(`/expenses/${id}`, expenseData);
        return response.data;
    },

    deleteExpense: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/expenses/${id}`);
        return response.data;
    },
};
