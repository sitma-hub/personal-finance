import axios from 'axios';
import { Liability, LiabilityFormData, ApiResponse } from '../types';

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

export const liabilityService = {
    getAllLiabilities: async (): Promise<ApiResponse<Liability[]>> => {
        const response = await api.get('/liabilities');
        return response.data;
    },

    getLiabilityById: async (id: string): Promise<ApiResponse<Liability>> => {
        const response = await api.get(`/liabilities/${id}`);
        return response.data;
    },

    createLiability: async (liabilityData: LiabilityFormData): Promise<ApiResponse<Liability>> => {
        const response = await api.post('/liabilities', liabilityData);
        return response.data;
    },

    updateLiability: async (id: string, liabilityData: Partial<LiabilityFormData>): Promise<ApiResponse<Liability>> => {
        const response = await api.put(`/liabilities/${id}`, liabilityData);
        return response.data;
    },

    deleteLiability: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/liabilities/${id}`);
        return response.data;
    },
};
