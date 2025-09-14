import axios from 'axios';
import { IncomeStream, IncomeFormData, ApiResponse } from '../types';

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

export const incomeService = {
    getAllIncomeStreams: async (): Promise<ApiResponse<IncomeStream[]>> => {
        const response = await api.get('/income');
        return response.data;
    },

    getIncomeStreamById: async (id: string): Promise<ApiResponse<IncomeStream>> => {
        const response = await api.get(`/income/${id}`);
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
