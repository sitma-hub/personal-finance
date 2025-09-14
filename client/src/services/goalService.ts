import axios from 'axios';
import { Goal, GoalFormData, ApiResponse } from '../types';

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

export const goalService = {
    getAllGoals: async (): Promise<ApiResponse<Goal[]>> => {
        const response = await api.get('/goals');
        return response.data;
    },

    getGoalById: async (id: string): Promise<ApiResponse<Goal>> => {
        const response = await api.get(`/goals/${id}`);
        return response.data;
    },

    createGoal: async (goalData: GoalFormData): Promise<ApiResponse<Goal>> => {
        const response = await api.post('/goals', goalData);
        return response.data;
    },

    updateGoal: async (id: string, goalData: Partial<GoalFormData>): Promise<ApiResponse<Goal>> => {
        const response = await api.put(`/goals/${id}`, goalData);
        return response.data;
    },

    deleteGoal: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/goals/${id}`);
        return response.data;
    },

    achieveGoal: async (id: string): Promise<ApiResponse<Goal>> => {
        const response = await api.patch(`/goals/${id}/achieve`);
        return response.data;
    },

    resetGoal: async (id: string): Promise<ApiResponse<Goal>> => {
        const response = await api.patch(`/goals/${id}/reset`);
        return response.data;
    },
};
