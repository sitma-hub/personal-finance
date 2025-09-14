import axios from 'axios';
import { Expense, ExpenseFormData, ApiResponse } from '../types';

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

export const expenseService = {
    getAllExpenses: async (): Promise<ApiResponse<Expense[]>> => {
        const response = await api.get('/expenses');
        return response.data;
    },

    getExpenseById: async (id: string): Promise<ApiResponse<Expense>> => {
        const response = await api.get(`/expenses/${id}`);
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
